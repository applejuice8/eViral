"""Campaign build pipeline.

Steps, tracked in campaign.progress so the build screen can poll real
progress: understand (vision, cached) -> images (YouCam, optional) ->
captions (one LLM call) -> checks (light tidy up, never blocks).

Media problems never fail a campaign: posts fall back to the original photo.
Any other error marks the step and the campaign as failed.
"""

import logging
import re
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from app.adapters.llm import LLMProvider
from app.adapters.media import DEFAULT_NEGATIVE_PROMPT, MediaProvider
from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models import (
    AppUser,
    Business,
    Campaign,
    MediaAsset,
    Post,
    Product,
    empty_progress,
    utcnow,
)
from app.schemas.campaigns import CampaignCreate
from app.services import media as media_service
from app.services.activity import log_activity
from app.services.planner import MYT, describe_schedule, plan_posts
from app.services.products import AI_ACTOR, understand_product
from app.services.writer import (
    CaptionSlot,
    campaign_payload,
    price_text,
    write_campaign_captions,
)

logger = logging.getLogger(__name__)

STAGE_SCENES = {
    "teaser": "moody close-up in soft low light with a dark background, a 'coming soon' feel",
    "launch": "bright clean hero shot on a plain light background with soft studio light",
    "reminder": "lifestyle shot on a home dining table with plates and a cup of tea, natural daylight",
    "last_chance": "warm festive scene with soft fairy lights and wrapped gift boxes around it",
}
STAGE_NEGATIVE_PROMPT = DEFAULT_NEGATIVE_PROMPT + ", text, letters, logo, different product"
STAGE_IMAGE_SIZE = "1024*1024"

HASHTAG_LIMITS = {"facebook": 5, "instagram": 10, "tiktok": 5}


def as_utc(value: datetime) -> datetime:
    # SQLite gives back naive datetimes; we store UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _stamp() -> str:
    return utcnow().isoformat().replace("+00:00", "Z")


# -- create -------------------------------------------------------------------


def create_campaign(
    db: Session, user: AppUser, product: Product, body: CampaignCreate
) -> Campaign:
    """Save the campaign and its planned posts (status draft)."""
    now = utcnow()
    planned = plan_posts(body.schedule, body.platforms, now)
    campaign = Campaign(
        business_id=user.business_id,
        product_id=product.id,
        language=body.language,
        platforms=list(body.platforms),
        schedule=describe_schedule(body.schedule, now),
        campaign_type=body.campaign_type,
        promo_kind=body.promo_kind,
        discount_percent=body.discount_percent,
        promo_price_myr=body.promo_price_myr,
        promo_note=(body.promo_note or "").strip() or None,
        status="building",
        progress=empty_progress(),
    )
    db.add(campaign)
    db.flush()
    for item in planned:
        db.add(
            Post(
                campaign_id=campaign.id,
                platform=item.platform,
                stage=item.stage,
                scheduled_at=item.scheduled_at,
                why_this_time=item.why_this_time,
                image_asset_id=product.original_asset_id,
                uses_original_image=True,
                status="draft",
            )
        )
    log_activity(
        db,
        action="draft",
        entity_type="campaign",
        entity_id=campaign.id,
        summary=(
            f"Promotion started for {product.name}"
            if body.campaign_type == "promotion"
            else f"Campaign started for {product.name}"
        ),
        actor=user.name,
        business_id=user.business_id,
        detail={"posts": len(planned), "mode": body.schedule.mode},
    )
    db.commit()
    db.refresh(campaign)
    return campaign


# -- build --------------------------------------------------------------------


def run_build(
    campaign_id: int, llm: LLMProvider, media: MediaProvider | None
) -> None:
    """Background task entry point; uses its own db session."""
    with SessionLocal() as db:
        build_campaign(db, campaign_id, llm, media, get_settings())


def build_campaign(
    db: Session,
    campaign_id: int,
    llm: LLMProvider,
    media: MediaProvider | None,
    settings: Settings,
) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    step = "understand"
    try:
        _set_step(db, campaign, step, "running")
        if campaign.product.understood is None:
            understand_product(db, campaign.product, llm)
        _set_step(db, campaign, step, "done")

        step = "images"
        _set_step(db, campaign, step, "running")
        note = _make_images(db, campaign, media, settings)
        # A note (in the error field) on a "done" step means images were
        # skipped or fell back — the build screen shows it as the reason.
        _set_step(db, campaign, step, "done", error=note)

        step = "captions"
        _set_step(db, campaign, step, "running")
        _write_captions(db, campaign, llm)
        # Final tidy-up (hashtags, fallbacks, post status) runs as part of the
        # captions step — it is no longer a visible progress step of its own.
        _check_posts(campaign)
        campaign.status = "scheduled"
        _set_step(db, campaign, step, "done")
    except Exception as exc:
        logger.exception("Campaign %s failed at %s", campaign_id, step)
        db.rollback()
        campaign = db.get(Campaign, campaign_id)
        message = str(exc)[:500] or exc.__class__.__name__
        campaign.status = "failed"
        campaign.error = f"{step} failed: {message}"
        for post in campaign.posts:
            post.status = "failed"
        _set_step(db, campaign, step, "failed", error=message)
    return campaign


def _set_step(
    db: Session, campaign: Campaign, step: str, state: str, error: str | None = None
) -> None:
    progress = campaign.progress or empty_progress()
    entry = dict(progress[step], state=state)
    if state == "running":
        entry["started_at"] = _stamp()
    else:
        entry["finished_at"] = _stamp()
        entry["started_at"] = entry.get("started_at") or entry["finished_at"]
    entry["error"] = error
    campaign.progress = {**progress, step: entry}
    db.commit()


# -- images -------------------------------------------------------------------


def _upload_type(asset: MediaAsset) -> str:
    # The YouCam File API wants "image/jpg" rather than "image/jpeg".
    return "image/png" if asset.mime == "image/png" else "image/jpg"


def _save_asset(
    db: Session, campaign: Campaign, *, kind: str, stage: str | None,
    file_name: str, url: str, parent: MediaAsset, settings: Settings,
) -> MediaAsset:
    asset = MediaAsset(
        business_id=campaign.business_id,
        kind=kind,
        stage=stage,
        path=str(Path(settings.media_dir) / file_name),
        url=url,
        mime="image/png" if file_name.endswith(".png") else "image/jpeg",
        parent_asset_id=parent.id,
        provider="youcam",
    )
    db.add(asset)
    db.flush()
    return asset


def _make_images(
    db: Session, campaign: Campaign, media: MediaProvider | None, settings: Settings
) -> str | None:
    """Enhance the original photo and build the stage images.

    Returns a note for progress.images.error explaining why posts fell back
    to the original photo (None when real AI images were made). Media
    problems never fail the campaign — they only leave a visible reason.
    """
    product = campaign.product
    original = product.original_asset
    base = original
    stage_assets: dict[str, MediaAsset] = {}
    note: str | None = None

    if media is None:
        if settings.media_mode == "live":
            note = (
                "Image editing is on, but the YouCam API key is missing or "
                "invalid — posts use your original photo."
            )
            logger.warning("Campaign %s: %s", campaign.id, note)
        else:
            note = "Image editing is off (MEDIA_MODE=passthrough) — posts use your original photo."

    if media is not None:
        try:
            logger.info("YouCam: enhance original photo (campaign %s)", campaign.id)
            result = media_service.enhance_image(
                media,
                image=Path(original.path).read_bytes(),
                content_type=original.mime,
                settings=settings,
            )
            base = _save_asset(
                db, campaign, kind="enhanced", stage=None, file_name=result.file_name,
                url=f"/media/{result.file_name}", parent=original, settings=settings,
            )
        except Exception as exc:
            logger.warning("Enhance failed, using the original photo: %s", exc)
            note = (
                f"AI photo enhance failed ({str(exc)[:200]}) — "
                "posts use your original photo."
            )

        stages = list(dict.fromkeys(p.stage for p in campaign.posts if p.stage))
        if base is not original and stages:
            stage_assets = _make_stage_images(db, campaign, media, base, stages, settings)

    for post in campaign.posts:
        asset = stage_assets.get(post.stage) or base
        post.image_asset_id = asset.id
        post.uses_original_image = asset.id == original.id

    if stage_assets:
        made = len(stage_assets)
        summary = f"{made} image{'s' if made != 1 else ''} made for {product.name}"
    elif base is not original:
        summary = f"Photo improved for {product.name}"
    else:
        summary = None
    if summary:
        log_activity(
            db,
            action="generated",
            entity_type="campaign",
            entity_id=campaign.id,
            summary=summary,
            actor=AI_ACTOR,
            business_id=campaign.business_id,
        )
    db.commit()
    return note


def _make_stage_images(
    db: Session,
    campaign: Campaign,
    media: MediaProvider,
    base: MediaAsset,
    stages: list[str],
    settings: Settings,
) -> dict[str, MediaAsset]:
    """Image-to-image from the enhanced photo, one per stage.

    The photo is uploaded once and all tasks are submitted before polling,
    so they run on YouCam's side at the same time.
    """
    understood = campaign.product.understood or {}
    thing = understood.get("product_type") or campaign.product.name
    try:
        logger.info("YouCam: upload enhanced photo (campaign %s)", campaign.id)
        file_id = media.upload_image(
            Path(base.path).read_bytes(), Path(base.path).name, _upload_type(base)
        )
    except Exception as exc:
        logger.warning("Upload for stage images failed: %s", exc)
        return {}

    tasks = {}
    for stage in stages:
        prompt = (
            f"The same {thing} from the photo, with its shape, colours and details "
            f"unchanged, in a {STAGE_SCENES[stage]}. Realistic food photo."
        )
        try:
            logger.info("YouCam: image-to-image %s (campaign %s)", stage, campaign.id)
            tasks[stage] = media.submit_poster_from_image(
                src_file_ids=[file_id],
                prompt=prompt,
                negative_prompt=STAGE_NEGATIVE_PROMPT,
                size=STAGE_IMAGE_SIZE,
            )
        except Exception as exc:
            logger.warning("Stage image %s failed to start: %s", stage, exc)

    assets: dict[str, MediaAsset] = {}
    for stage, task in tasks.items():
        try:
            file_name, url = media_service.save_result(media, task, settings, "stage")
        except Exception as exc:
            logger.warning("Stage image %s failed: %s", stage, exc)
            continue
        assets[stage] = _save_asset(
            db, campaign, kind="stage", stage=stage, file_name=file_name,
            url=url, parent=base, settings=settings,
        )
    return assets


# -- captions -----------------------------------------------------------------


def _write_captions(db: Session, campaign: Campaign, llm: LLMProvider) -> None:
    product = campaign.product
    business = db.get(Business, campaign.business_id)
    posts = list(campaign.posts)
    slots = [
        CaptionSlot(
            id=str(i + 1),
            platform=post.platform,
            stage=post.stage,
            date=as_utc(post.scheduled_at).astimezone(MYT).strftime("%a %-d %b"),
        )
        for i, post in enumerate(posts)
    ]
    payload = campaign_payload(
        business_name=business.name,
        product_name=product.name,
        price_myr=product.price_myr,
        note=product.note,
        seen_in_photo=list(product.confirmed_attributes or []),
        language=campaign.language,
        slots=slots,
        campaign_type=campaign.campaign_type,
        promo_kind=campaign.promo_kind,
        discount_percent=campaign.discount_percent,
        promo_price_myr=campaign.promo_price_myr,
        promo_note=campaign.promo_note,
    )
    captions, model = write_campaign_captions(payload, llm)
    for slot, post in zip(slots, posts):
        result = captions[slot.id]
        post.caption = result.caption.strip()
        post.hashtags = result.hashtags
        post.video_idea = (result.video_idea or "").strip() or None
    log_activity(
        db,
        action="generated",
        entity_type="campaign",
        entity_id=campaign.id,
        summary=f"{len(posts)} captions written for {product.name}",
        actor=AI_ACTOR,
        business_id=campaign.business_id,
        detail={"model": model},
    )
    db.commit()


# -- checks -------------------------------------------------------------------

_PRICE = r"\bRM\s?\d[\d,]*(?:\.\d{1,2})?"
_PRICE_RE = re.compile(_PRICE, re.IGNORECASE)
_PRICE_WITH_BRACKETS_RE = re.compile(rf"\(?{_PRICE}\)?", re.IGNORECASE)
_TRAILING_TAGS_RE = re.compile(r"(?:\s*#[^\s#]+)+\s*$")


def clean_hashtags(tags: list[str], limit: int) -> list[str]:
    out: list[str] = []
    for tag in tags:
        word = re.sub(r"[^\w]", "", str(tag), flags=re.UNICODE)
        if word and f"#{word}".lower() not in (t.lower() for t in out):
            out.append(f"#{word}")
    return out[:limit]


def _price_token(amount: str) -> re.Pattern:
    """Regex for an exact RM amount: RM15 / RM 15 / RM15.00, not RM150.

    The lookahead blocks thousands groupings too ("RM65,000" is not RM65).
    """
    return re.compile(rf"\bRM\s?{re.escape(amount)}(?!\d|,\d)", re.IGNORECASE)


def _apply_promo_price(text: str, price: Decimal, promo_price: Decimal) -> str:
    """Keep the price honest when the product is discounted.

    The caption must show the deal ("was RM15, now RM12"). If the model
    already wrote both prices, leave it alone; if it wrote only one of
    them, turn the first occurrence into the deal; if it wrote neither,
    append the deal. Stray other prices are left untouched — rewriting
    them could lie about the offer.
    """
    if not text:
        return text
    was_amt, now_amt = price_text(price), price_text(promo_price)
    was_re, now_re = _price_token(was_amt), _price_token(now_amt)
    deal = f"was RM{was_amt}, now RM{now_amt}"
    has_was = was_re.search(text) is not None
    has_now = now_re.search(text) is not None
    if has_was and has_now:
        return text
    if has_was:
        return was_re.sub(deal, text, count=1)
    if has_now:
        return now_re.sub(deal, text, count=1)
    return f"{text} {deal[0].upper() + deal[1:]}."


def tidy_post(
    caption: str,
    hashtags: list[str],
    platform: str,
    price: Decimal | None,
    promo_price: Decimal | None = None,
) -> tuple[str, list[str]]:
    """Move stray hashtags out of the text and keep the price honest."""
    text = caption.strip()
    trailing = _TRAILING_TAGS_RE.search(text)
    if trailing:
        hashtags = list(hashtags) + trailing.group().split()
        text = text[: trailing.start()].rstrip()

    if price is None:
        text = _PRICE_WITH_BRACKETS_RE.sub("", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r" +([.,!?])", r"\1", text).strip()
    elif promo_price is not None:
        text = _apply_promo_price(text, price, promo_price)
    else:
        text = _PRICE_RE.sub(f"RM{price_text(price)}", text)

    return text, clean_hashtags(hashtags, HASHTAG_LIMITS.get(platform, 5))


def _check_posts(campaign: Campaign) -> None:
    product = campaign.product
    promo_price = (
        campaign.promo_price_myr if campaign.promo_kind == "discount" else None
    )
    for post in campaign.posts:
        caption, hashtags = tidy_post(
            post.caption or "", post.hashtags or [], post.platform, product.price_myr,
            promo_price,
        )
        if not caption:
            caption = product.name if not product.note else f"{product.name}. {product.note}"
            if promo_price is not None and product.price_myr is not None:
                caption += (
                    f" Was RM{price_text(product.price_myr)}, "
                    f"now RM{price_text(promo_price)}."
                )
        post.caption = caption
        post.hashtags = hashtags
        if post.platform == "tiktok" and not post.video_idea:
            post.video_idea = f"Short clip showing the {product.name} up close."
        if post.image_asset_id is None:
            post.image_asset_id = product.original_asset_id
            post.uses_original_image = True
        post.status = "scheduled"
