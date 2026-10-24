from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import UTCDateTime
from app.schemas.products import ProductResponse

Platform = Literal["facebook", "instagram", "tiktok"]
Language = Literal["ms", "en", "mixed"]
Stage = Literal["teaser", "launch", "reminder", "last_chance"]
ScheduleMode = Literal["launch_sequence", "weekly", "custom"]
Weekday = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
StepState = Literal["pending", "running", "done", "failed"]
CampaignStatus = Literal["building", "scheduled", "done", "failed"]
PostStatus = Literal["draft", "scheduled", "posted", "failed"]
CampaignType = Literal["new_product", "promotion"]
PromoKind = Literal["promote", "discount"]

MAX_POSTS_PER_CAMPAIGN = 30


class ScheduleIn(BaseModel):
    mode: ScheduleMode
    start_date: date | None = None
    dates: list[date] = Field(default=[], max_length=MAX_POSTS_PER_CAMPAIGN)
    time: str = Field(default="20:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    days: list[Weekday] = []
    weeks: int = Field(default=2, ge=1, le=8)
    slots: list[datetime] = Field(default=[], max_length=MAX_POSTS_PER_CAMPAIGN)

    @model_validator(mode="after")
    def _check_mode(self) -> "ScheduleIn":
        if self.start_date is None and self.dates and self.mode != "custom":
            self.start_date = self.dates[0]
        if self.mode == "weekly" and not self.days:
            raise ValueError("weekly schedule needs at least one day")
        if self.mode == "custom" and not (self.slots or self.dates):
            raise ValueError("custom schedule needs dates or slots")
        return self


class CampaignCreate(BaseModel):
    product_id: int
    language: Language = "mixed"
    platforms: list[Platform] = Field(min_length=1, max_length=3)
    schedule: ScheduleIn
    campaign_type: CampaignType = "new_product"
    promo_kind: PromoKind | None = None
    discount_percent: Decimal | None = Field(default=None, ge=1, le=99)
    promo_price_myr: Decimal | None = Field(default=None, gt=0)
    # promotion occasion, used in captions
    promo_note: str | None = Field(default=None, max_length=140)

    @field_validator("platforms")
    @classmethod
    def _unique(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))

    @field_validator("promo_price_myr", "discount_percent")
    @classmethod
    def _quantize(cls, v: Decimal | None) -> Decimal | None:
        return None if v is None else v.quantize(Decimal("0.01"))

    @model_validator(mode="after")
    def _check_promo(self) -> "CampaignCreate":
        if self.campaign_type != "promotion":
            # drop promo fields for new-product campaigns
            self.promo_kind = None
            self.discount_percent = None
            self.promo_price_myr = None
            self.promo_note = None
            return self
        if self.promo_kind is None:
            raise ValueError("promotion campaigns need promo_kind")
        if self.promo_kind == "promote" and (
            self.discount_percent is not None or self.promo_price_myr is not None
        ):
            raise ValueError("a promote campaign cannot have a discount")
        if self.promo_kind == "discount" and (
            self.discount_percent is None and self.promo_price_myr is None
        ):
            raise ValueError("a discount needs discount_percent or promo_price_myr")
        return self


class StepProgress(BaseModel):
    state: StepState
    started_at: UTCDateTime | None = None
    finished_at: UTCDateTime | None = None
    error: str | None = None


class Progress(BaseModel):
    understand: StepProgress
    images: StepProgress
    captions: StepProgress
    # old progress JSON may still carry a checks key; pydantic drops it


class PostResponse(BaseModel):
    id: int
    campaign_id: int
    product_id: int
    product_name: str
    platform: Platform
    stage: Stage | None
    caption: str
    hashtags: list[str]
    video_idea: str | None
    image_url: str | None
    uses_original_image: bool
    scheduled_at: UTCDateTime | None
    status: PostStatus
    posted_at: UTCDateTime | None
    published_url: str | None
    why_this_time: str | None


class FeedPostResponse(PostResponse):
    business_name: str


class CampaignResponse(BaseModel):
    id: int
    status: CampaignStatus
    language: Language
    platforms: list[Platform]
    schedule: dict
    progress: Progress
    error: str | None
    created_at: UTCDateTime
    updated_at: UTCDateTime
    campaign_type: CampaignType
    promo_kind: PromoKind | None
    discount_percent: Decimal | None
    promo_price_myr: Decimal | None
    promo_note: str | None
    product: ProductResponse
    posts: list[PostResponse]


class CampaignSummary(BaseModel):
    id: int
    status: CampaignStatus
    product_id: int
    product_name: str
    photo_url: str
    # launch image, else the original photo
    cover_url: str
    language: Language
    platforms: list[Platform]
    schedule_mode: ScheduleMode
    campaign_type: CampaignType
    promo_kind: PromoKind | None
    discount_percent: Decimal | None
    promo_price_myr: Decimal | None
    promo_note: str | None
    posts_total: int
    posts_scheduled: int
    posts_posted: int
    first_post_at: UTCDateTime | None
    last_post_at: UTCDateTime | None
    created_at: UTCDateTime


class PostUpdate(BaseModel):
    caption: str | None = Field(default=None, min_length=1, max_length=2200)
    hashtags: list[str] | None = Field(default=None, max_length=30)
    # no offset = Malaysia time
    scheduled_at: datetime | None = None


class ImageChoiceRequest(BaseModel):
    use_original_image: bool


class PostCaption(BaseModel):
    id: str
    caption: str = Field(min_length=1)
    hashtags: list[str] = []
    video_idea: str | None = None

    @field_validator("id", mode="before")
    @classmethod
    def _id_as_str(cls, v) -> str:
        return str(v)

    @field_validator("hashtags", mode="before")
    @classmethod
    def _hashtags(cls, v) -> list[str]:
        if isinstance(v, str):
            v = v.split()
        return [str(tag) for tag in (v or [])]


class CampaignCaptions(BaseModel):
    posts: list[PostCaption]
