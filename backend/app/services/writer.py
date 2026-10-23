"""Caption generation via the LLM adapter.

Facts discipline (TECHNICAL_IMPLEMENTATION.md §7): the model sees ONLY the
owner-entered fields on the request. It must never invent prices, dates,
flavours, certifications or awards; if price is absent it must not mention
one. The validator service (future) re-checks all of this.
"""

from pydantic import ValidationError
from app.adapters.llm import LLMError, LLMProvider
from app.schemas.captions import (
    CaptionRequest,
    CaptionResponse,
    GeneratedCaption,
    Platform,
)

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
    """Validate model output; keep only requested platforms, in request order."""
    try:
        parsed = [
            GeneratedCaption.model_validate(item)
            for item in raw.get("captions", [])
        ]
    except (AttributeError, TypeError, ValidationError) as exc:
        raise LLMError(f"Model output did not match the expected shape: {exc}") from exc

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
