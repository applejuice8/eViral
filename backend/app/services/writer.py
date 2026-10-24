from dataclasses import dataclass
from decimal import Decimal

from pydantic import ValidationError

from app.adapters.llm import LLMError, LLMProvider
from app.schemas.captions import (
    CaptionRequest,
    CaptionResponse,
    GeneratedCaption,
    Platform,
)
from app.schemas.campaigns import CampaignCaptions, PostCaption

_SYSTEM_PROMPT = """You write social media posts for a small Malaysian business.
Use ONLY the facts in <facts>. Do not invent prices, discounts, dates, flavours,
ingredients, sizes, certifications or awards. If a fact is missing, leave it out.
If <facts>.price is null, do not mention any price.
Match the language setting ('ms' = Bahasa Melayu, 'en' = English,
'mixed' = natural BM + English mix).
Vary the message by campaign stage (teaser, launch, detail, reminder, last_chance).
Never promise virality or guaranteed results. Never mention customers by name.
Platform rules:
- facebook: friendly, 1-3 short paragraphs
- instagram: punchy caption + 5-10 hashtags
- tiktok: very short hook + 3-5 hashtags + a one-line video_idea
List every factual claim you make in rationale, briefly.
Respond with JSON only, exactly this shape:
{"captions": [{"platform": "...", "caption": "...", "hashtags": ["#..."],
               "video_idea": "..." or null, "rationale": "..."}]}
Include one captions entry for every platform listed in <facts>.platforms.
"""

_JSON_SCHEMA_HINT = {
    "type": "object",
    "properties": {
        "captions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "platform": {"type": "string"},
                    "caption": {"type": "string"},
                    "hashtags": {"type": "array", "items": {"type": "string"}},
                    "video_idea": {"type": ["string", "null"]},
                    "rationale": {"type": "string"},
                },
                "required": ["platform", "caption", "hashtags", "rationale"],
            },
        }
    },
    "required": ["captions"],
}


def _user_payload(request: CaptionRequest) -> dict:
    facts = {
        "product_name": request.product_name,
        "price": None if request.price is None else float(request.price),
        "note": request.note,
        "platforms": list(request.platforms),
        "stage": request.stage,
        "language": request.language,
        "goal": request.goal,
    }
    return {"facts": facts, "response_shape": _JSON_SCHEMA_HINT}


def _parse_captions(raw: dict, request: CaptionRequest) -> list[GeneratedCaption]:
    parsed: list[GeneratedCaption] = []
    if not isinstance(raw, dict):
        raise LLMError(f"Model returned non-object JSON: {raw!r}")
    for item in raw.get("captions", []):
        try:
            cap = GeneratedCaption.model_validate(item)
        except ValidationError:
            continue
        parsed.append(cap)

    by_platform: dict[Platform, GeneratedCaption] = {}
    for cap in parsed:
        by_platform.setdefault(cap.platform, cap)

    missing = [p for p in request.platforms if p not in by_platform]
    if missing:
        raise LLMError(f"Model did not return captions for: {', '.join(missing)}")

    return [by_platform[p] for p in request.platforms]


def generate_captions(request: CaptionRequest, provider: LLMProvider) -> CaptionResponse:
    raw = provider.chat_json(_SYSTEM_PROMPT, _user_payload(request))
    captions = _parse_captions(raw, request)
    return CaptionResponse(captions=captions, model=provider.model_name)


# -- campaign captions (one call for every post) ------------------------------

CAMPAIGN_PROMPT = """You write social media posts for a small Malaysian business.
Use ONLY the facts in "facts". Do not invent prices, discounts, dates, flavours,
ingredients, sizes, certifications, awards or delivery details. If a fact is
missing, leave it out. "seen_in_photo" lists what the owner confirmed is in the
photo; you may describe those things.
If facts.price_myr is null, do not mention any price. If it is set, write it
exactly as "RM" + the number (e.g. RM65).
Promotions: facts.promo is set only when the campaign promotes an existing
product.
- promo.kind "promote": normal posts at the product's usual price.
- promo.kind "discount": the product is on offer. Mention the deal naturally,
  e.g. "was RM15, now RM12", always using promo.was_price_myr and
  promo.now_price_myr exactly. If promo.occasion is set (Raya, Merdeka,
  weekend only...), mention it too. Never invent other discounts or dates.
Language: 'ms' = Bahasa Melayu, 'en' = English, 'mixed' = natural Malaysian
mix of BM and English.
Write one post for every item in "posts" and keep its "id". Match the stage:
- teaser: build curiosity, "coming soon" feel, don't give everything away
- launch: it is available now
- reminder: friendly nudge for people who missed it
- last_chance: last call, gentle urgency, no made-up deadlines
- null: a normal post in a regular schedule; vary the angle between posts
Platform style:
- facebook: friendly, 1-3 short paragraphs
- instagram: punchy, 1-2 short paragraphs, a few emojis are fine
- tiktok: one very short hook line, plus "video_idea": one line describing a
  simple clip the owner can film on a phone
Never put hashtags in "caption". Put them in "hashtags", each starting with #
(facebook 2-4, instagram 5-10, tiktok 3-5).
Posts for the same stage on different platforms must not be copies.
Never promise results. Never mention customers by name.
Respond with JSON only, exactly this shape:
{"posts": [{"id": "1", "caption": "...", "hashtags": ["#..."], "video_idea": "..." or null}]}"""


def price_text(price: Decimal) -> str:
    return str(int(price)) if price == price.to_integral_value() else f"{price:.2f}"


@dataclass
class CaptionSlot:
    id: str
    platform: str
    stage: str | None
    date: str  # e.g. "Sat 25 Oct", Malaysia time


def campaign_payload(
    *,
    business_name: str,
    product_name: str,
    price_myr: Decimal | None,
    note: str | None,
    seen_in_photo: list[str],
    language: str,
    slots: list[CaptionSlot],
    campaign_type: str = "new_product",
    promo_kind: str | None = None,
    discount_percent: Decimal | None = None,
    promo_price_myr: Decimal | None = None,
    promo_note: str | None = None,
) -> dict:
    promo: dict | None = None
    if campaign_type == "promotion" and promo_kind == "discount" and promo_price_myr:
        promo = {
            "kind": "discount",
            # keep both numbers so captions can say "was X, now Y"
            "was_price_myr": price_text(price_myr) if price_myr is not None else None,
            "now_price_myr": price_text(promo_price_myr),
            "percent_off": None if discount_percent is None else float(discount_percent),
            "occasion": promo_note,
        }
    elif campaign_type == "promotion" and promo_kind == "promote":
        promo = {"kind": "promote", "occasion": promo_note}
    return {
        "facts": {
            "business_name": business_name,
            "product_name": product_name,
            "price_myr": None if price_myr is None else price_text(price_myr),
            "note": note,
            "seen_in_photo": seen_in_photo,
            "promo": promo,
        },
        "language": language,
        "posts": [
            {"id": s.id, "platform": s.platform, "stage": s.stage, "date": s.date}
            for s in slots
        ],
    }


def write_campaign_captions(
    payload: dict, provider: LLMProvider
) -> tuple[dict[str, PostCaption], str]:
    wanted = [p["id"] for p in payload["posts"]]

    def parse(raw: dict) -> dict[str, PostCaption]:
        result = CampaignCaptions.model_validate(raw)
        by_id = {p.id: p for p in result.posts}
        missing = [i for i in wanted if i not in by_id]
        if missing:
            raise ValueError(f"model skipped posts {', '.join(missing)}")
        return {i: by_id[i] for i in wanted}

    return provider.text_json(CAMPAIGN_PROMPT, payload, parse)
