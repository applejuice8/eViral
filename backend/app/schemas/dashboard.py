from typing import Literal

from pydantic import BaseModel

from app.schemas.campaigns import CampaignSummary, PostResponse
from app.schemas.common import UTCDateTime

ActivityAction = Literal["draft", "generated", "posted"]


class ActivityResponse(BaseModel):
    id: int
    action: ActivityAction
    entity_type: str
    entity_id: int | None
    summary: str
    actor: str
    detail: dict | None
    created_at: UTCDateTime


class SummaryResponse(BaseModel):
    business_name: str
    owner_name: str
    scheduled: int
    posted: int
    this_week: int
    campaigns: int
    active_campaigns: int
    products: int
    next_post: PostResponse | None
    upcoming: list[PostResponse]
    latest_campaign: CampaignSummary | None


class TickResponse(BaseModel):
    posted: int
