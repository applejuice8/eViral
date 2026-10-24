from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Platform = Literal["facebook", "instagram", "tiktok"]
Language = Literal["ms", "en", "mixed"]
Stage = Literal["teaser", "launch", "detail", "reminder", "last_chance"]


class CaptionRequest(BaseModel):
    product_name: str = Field(min_length=1, max_length=80)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    note: str | None = Field(default=None, max_length=140)
    platforms: list[Platform] = Field(min_length=1, max_length=3)
    stage: Stage = "launch"
    language: Language = "mixed"
    goal: str | None = Field(default=None, max_length=140)


class GeneratedCaption(BaseModel):
    platform: Platform
    caption: str
    hashtags: list[str]
    video_idea: str | None = None
    rationale: str


class CaptionResponse(BaseModel):
    captions: list[GeneratedCaption]
    model: str
