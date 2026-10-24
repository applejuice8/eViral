import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.llm import LLMProvider, get_llm_provider
from app.adapters.media import MediaNotConfiguredError, MediaProvider, get_media_provider
from app.config import get_settings
from app.db import get_db
from app.deps import current_user
from app.models import AppUser, Campaign, MediaAsset, Post, utcnow
from app.routers.products import get_product
from app.routers.products import to_response as product_response
from app.schemas.campaigns import (
    CampaignCreate,
    CampaignResponse,
    CampaignSummary,
    ImageChoiceRequest,
    PostResponse,
)
from app.services.pipeline import create_campaign, run_build
from app.services.planner import MYT, PlanError, today_myt

logger = logging.getLogger(__name__)

router = APIRouter(tags=["campaigns"])


def pipeline_media() -> MediaProvider | None:
    """YouCam provider when MEDIA_MODE=live and a key is set, else None."""
    if get_settings().media_mode != "live":
        return None
    try:
        return get_media_provider()
    except MediaNotConfiguredError:
        logger.warning(
            "MEDIA_MODE is 'live' but YOUCAM_API_KEY is not set — campaigns "
            "will be built with the original photo. Set the key or switch "
            "MEDIA_MODE back to 'passthrough' to silence this."
        )
        return None


def post_response(post: Post) -> PostResponse:
    product = post.campaign.product
    return PostResponse(
        id=post.id,
        campaign_id=post.campaign_id,
        product_id=product.id,
        product_name=product.name,
        platform=post.platform,
        stage=post.stage,
        caption=post.caption or "",
        hashtags=post.hashtags or [],
        video_idea=post.video_idea,
        image_url=post.image_asset.url if post.image_asset else None,
        uses_original_image=post.uses_original_image,
        scheduled_at=post.scheduled_at,
        status=post.status,
        posted_at=post.posted_at,
        published_url=post.published_url,
        why_this_time=post.why_this_time,
    )


def campaign_response(campaign: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=campaign.id,
        status=campaign.status,
        language=campaign.language,
        platforms=campaign.platforms,
        schedule=campaign.schedule,
        progress=campaign.progress,
        error=campaign.error,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        product=product_response(campaign.product),
        posts=[post_response(p) for p in campaign.posts],
    )


def campaign_summary(campaign: Campaign) -> CampaignSummary:
    posts = campaign.posts
    times = [p.scheduled_at for p in posts if p.scheduled_at]
    launch = next(
        (p.image_asset for p in posts if p.stage == "launch" and p.image_asset), None
    )
    first_image = next((p.image_asset for p in posts if p.image_asset), None)
    photo_url = campaign.product.original_asset.url
    return CampaignSummary(
        id=campaign.id,
        status=campaign.status,
        product_id=campaign.product_id,
        product_name=campaign.product.name,
        photo_url=photo_url,
        cover_url=(launch or first_image).url if (launch or first_image) else photo_url,
        language=campaign.language,
        platforms=campaign.platforms,
        schedule_mode=campaign.schedule.get("mode", "launch_sequence"),
        posts_total=len(posts),
        posts_scheduled=sum(p.status == "scheduled" for p in posts),
        posts_posted=sum(p.status == "posted" for p in posts),
        first_post_at=min(times) if times else None,
        last_post_at=max(times) if times else None,
        created_at=campaign.created_at,
    )


def get_campaign(campaign_id: int, db: Session, user: AppUser) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None or campaign.business_id != user.business_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return campaign


@router.post(
    "/campaigns",
    response_model=CampaignResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create(
    body: CampaignCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
    llm: LLMProvider = Depends(get_llm_provider),
    media: MediaProvider | None = Depends(pipeline_media),
) -> CampaignResponse:
    """Plan the posts and start building them in the background.

    Poll GET /campaigns/{id} until status is "scheduled" (or "failed").
    """
    product = get_product(body.product_id, db, user)
    try:
        campaign = create_campaign(db, user, product, body)
    except PlanError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    background.add_task(run_build, campaign.id, llm, media)
    return campaign_response(campaign)


@router.get("/campaigns", response_model=list[CampaignSummary])
def list_campaigns(
    db: Session = Depends(get_db), user: AppUser = Depends(current_user)
) -> list[CampaignSummary]:
    """All campaigns, newest first."""
    campaigns = db.scalars(
        select(Campaign)
        .where(Campaign.business_id == user.business_id)
        .order_by(Campaign.created_at.desc(), Campaign.id.desc())
    )
    return [campaign_summary(c) for c in campaigns]


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def read(
    campaign_id: int,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> CampaignResponse:
    return campaign_response(get_campaign(campaign_id, db, user))


def _ai_base_asset(db: Session, campaign: Campaign) -> MediaAsset | None:
    """The campaign's enhanced (AI) base image, if one was made.

    Found by walking up from the posts' current images, so it stays scoped
    to this campaign. Falls back to the newest enhanced asset built from the
    product's original photo (e.g. all posts were switched to the original).
    """
    original_id = campaign.product.original_asset_id
    for post in campaign.posts:
        asset = post.image_asset
        if asset is None or asset.kind == "original":
            continue
        if asset.kind == "enhanced":
            return asset
        parent = db.get(MediaAsset, asset.parent_asset_id) if asset.parent_asset_id else None
        if parent is not None and parent.kind == "enhanced":
            return parent
    return db.scalar(
        select(MediaAsset)
        .where(
            MediaAsset.kind == "enhanced",
            MediaAsset.parent_asset_id == original_id,
        )
        .order_by(MediaAsset.id.desc())
    )


@router.post(
    "/campaigns/{campaign_id}/image-choice",
    response_model=CampaignResponse,
)
def set_image_choice(
    campaign_id: int,
    body: ImageChoiceRequest,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> CampaignResponse:
    """Choose what image the campaign's posts use: original photo or AI image.

    Picking the AI image re-points every post at its stage image (or the
    enhanced base photo when no stage image exists); picking the original
    re-points them all at the uploaded photo.
    """
    campaign = get_campaign(campaign_id, db, user)
    product = campaign.product
    original = product.original_asset

    ai_base = None
    if not body.use_original_image:
        ai_base = _ai_base_asset(db, campaign)
        if ai_base is None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "No AI image was made for this campaign, so posts can only use the original photo.",
            )

    for post in campaign.posts:
        asset = original
        if ai_base is not None:
            stage_asset = (
                db.scalar(
                    select(MediaAsset)
                    .where(
                        MediaAsset.kind == "stage",
                        MediaAsset.parent_asset_id == ai_base.id,
                        MediaAsset.stage == post.stage,
                    )
                    .order_by(MediaAsset.id.desc())
                )
                if post.stage
                else None
            )
            asset = stage_asset or ai_base
        # Assign the relationship (not just the FK) so the response serialises
        # the new asset even though expire_on_commit is off.
        post.image_asset = asset
        post.uses_original_image = asset.id == original.id
    db.commit()
    db.refresh(campaign)
    return campaign_response(campaign)


def _month_end(day: date) -> date:
    next_month = (day.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month - timedelta(days=1)


@router.get("/calendar", response_model=list[PostResponse])
def calendar(
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: date | None = None,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> list[PostResponse]:
    """Posts scheduled between two dates (Malaysia time, both days included).

    Defaults to the current month and the next one.
    """
    start_day = from_ or today_myt(utcnow()).replace(day=1)
    end_day = to or _month_end(_month_end(start_day) + timedelta(days=1))
    if end_day < start_day:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "'to' is before 'from'")
    # SQLite drops the offset, so compare in UTC.
    start = datetime.combine(start_day, time.min, tzinfo=MYT).astimezone(timezone.utc)
    end = datetime.combine(
        end_day + timedelta(days=1), time.min, tzinfo=MYT
    ).astimezone(timezone.utc)
    posts = db.scalars(
        select(Post)
        .join(Campaign)
        .where(
            Campaign.business_id == user.business_id,
            Post.scheduled_at >= start,
            Post.scheduled_at < end,
        )
        .order_by(Post.scheduled_at, Post.id)
    )
    return [post_response(p) for p in posts]
