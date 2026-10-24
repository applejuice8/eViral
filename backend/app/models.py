from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ASSET_KINDS = ("original", "enhanced", "stage")
STAGES = ("teaser", "launch", "reminder", "last_chance")
PLATFORMS = ("facebook", "instagram", "tiktok")
LANGUAGES = ("ms", "en", "mixed")
SCHEDULE_MODES = ("launch_sequence", "weekly", "custom")
CAMPAIGN_STATUSES = ("building", "scheduled", "done", "failed")
CAMPAIGN_TYPES = ("new_product", "promotion")
PROMO_KINDS = ("promote", "discount")
PROGRESS_STEPS = ("understand", "images", "captions")
STEP_STATES = ("pending", "running", "done", "failed")
POST_STATUSES = ("draft", "scheduled", "posted", "failed")
ACTIVITY_ACTIONS = ("draft", "generated", "posted")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def empty_progress() -> dict:
    return {
        step: {"state": "pending", "started_at": None, "finished_at": None, "error": None}
        for step in PROGRESS_STEPS
    }


class Business(Base):
    __tablename__ = "business"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(80))
    halal_certified: Mapped[bool] = mapped_column(Boolean, default=False)
    tone: Mapped[str] = mapped_column(String(40), default="friendly")
    # e.g. ["ms", "en"]
    languages: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    users: Mapped[list["AppUser"]] = relationship(back_populates="business")


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(40), default="owner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    business: Mapped[Business] = relationship(back_populates="users")


class MediaAsset(Base):
    __tablename__ = "media_asset"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # ASSET_KINDS
    stage: Mapped[str | None] = mapped_column(String(20))  # set when kind == "stage"
    # file path in MEDIA_DIR + public /media URL
    path: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(500))
    mime: Mapped[str] = mapped_column(String(50))
    parent_asset_id: Mapped[int | None] = mapped_column(ForeignKey("media_asset.id"))
    provider: Mapped[str | None] = mapped_column(String(40))  # "upload", "youcam", ...
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Product(Base):
    __tablename__ = "product"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    price_myr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    note: Mapped[str | None] = mapped_column(String(140))
    original_asset_id: Mapped[int] = mapped_column(ForeignKey("media_asset.id"))
    # raw vision model output
    understood: Mapped[dict | None] = mapped_column(JSON)
    # owner-confirmed attributes, the only ones captions may use
    confirmed_attributes: Mapped[list | None] = mapped_column(JSON)
    understood_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    understood_model: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    original_asset: Mapped[MediaAsset] = relationship()


class Campaign(Base):
    __tablename__ = "campaign"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("product.id"), index=True)
    language: Mapped[str] = mapped_column(String(10))  # LANGUAGES
    platforms: Mapped[list] = mapped_column(JSON)  # subset of PLATFORMS
    # {"mode": SCHEDULE_MODES, "days": [...], "time": "HH:MM", "start_date": "YYYY-MM-DD"}
    schedule: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="building")
    # new_product or promotion
    campaign_type: Mapped[str] = mapped_column(String(20), default="new_product")
    # "promote" or "discount", promotions only
    promo_kind: Mapped[str | None] = mapped_column(String(20))
    # what the user typed; the other side is derived
    discount_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    promo_price_myr: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    # e.g. "Raya sale", used in captions
    promo_note: Mapped[str | None] = mapped_column(String(140))
    # {step: {"state", "started_at", "finished_at", "error"}} for PROGRESS_STEPS
    progress: Mapped[dict] = mapped_column(JSON, default=empty_progress)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    product: Mapped[Product] = relationship()
    posts: Mapped[list["Post"]] = relationship(
        back_populates="campaign", order_by="Post.scheduled_at"
    )


class Post(Base):
    __tablename__ = "post"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaign.id"), index=True)
    platform: Mapped[str] = mapped_column(String(20))  # PLATFORMS
    # launch stage, null for other schedules
    stage: Mapped[str | None] = mapped_column(String(20))
    caption: Mapped[str] = mapped_column(Text, default="")
    hashtags: Mapped[list] = mapped_column(JSON, default=list)
    video_idea: Mapped[str | None] = mapped_column(Text)
    image_asset_id: Mapped[int | None] = mapped_column(ForeignKey("media_asset.id"))
    uses_original_image: Mapped[bool] = mapped_column(Boolean, default=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # post URL from the publisher
    published_url: Mapped[str | None] = mapped_column(String(500))
    why_this_time: Mapped[str | None] = mapped_column(String(300))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    campaign: Mapped[Campaign] = relationship(back_populates="posts")
    image_asset: Mapped[MediaAsset | None] = relationship()


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int | None] = mapped_column(ForeignKey("business.id"), index=True)
    action: Mapped[str] = mapped_column(String(20), index=True)  # ACTIVITY_ACTIONS
    entity_type: Mapped[str] = mapped_column(String(40))  # "product", "campaign", "post"
    entity_id: Mapped[int | None] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
    detail: Mapped[dict | None] = mapped_column(JSON)
    actor: Mapped[str] = mapped_column(String(120))  # user name or "eViral AI" / "system"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
