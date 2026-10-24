from datetime import datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import ACTIVITY_ACTIONS, ActivityLog, AppUser, Campaign, Post, Product, utcnow
from app.routers.campaigns import campaign_summary, post_response
from app.schemas.dashboard import ActivityResponse, SummaryResponse
from app.services.planner import MYT, today_myt

router = APIRouter(tags=["dashboard"])


@router.get("/activity", response_model=list[ActivityResponse])
def activity(
    action: Literal["draft", "generated", "posted"] | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> list[ActivityResponse]:
    query = select(ActivityLog).where(
        ActivityLog.business_id == user.business_id,
        ActivityLog.action.in_(ACTIVITY_ACTIONS),
    )
    if action:
        query = query.where(ActivityLog.action == action)
    query = query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).limit(limit)
    return [ActivityResponse.model_validate(row, from_attributes=True) for row in db.scalars(query)]


@router.get("/summary", response_model=SummaryResponse)
def summary(
    db: Session = Depends(get_db), user: AppUser = Depends(current_user)
) -> SummaryResponse:
    now = utcnow()
    today = today_myt(now)
    week_start_day = today - timedelta(days=today.weekday())
    # compare in UTC
    week_start = datetime.combine(week_start_day, time.min, tzinfo=MYT).astimezone(timezone.utc)
    week_end = week_start + timedelta(days=7)

    posts = select(func.count(Post.id)).join(Campaign).where(
        Campaign.business_id == user.business_id
    )
    scheduled = db.scalar(posts.where(Post.status == "scheduled"))
    posted = db.scalar(posts.where(Post.status == "posted"))
    this_week = db.scalar(
        posts.where(
            or_(
                and_(
                    Post.status == "scheduled",
                    Post.scheduled_at >= week_start,
                    Post.scheduled_at < week_end,
                ),
                and_(
                    Post.status == "posted",
                    Post.posted_at >= week_start,
                    Post.posted_at < week_end,
                ),
            )
        )
    )

    campaigns = select(func.count(Campaign.id)).where(Campaign.business_id == user.business_id)
    upcoming = db.scalars(
        select(Post)
        .join(Campaign)
        .where(Campaign.business_id == user.business_id, Post.status == "scheduled")
        .order_by(Post.scheduled_at, Post.id)
        .limit(5)
    ).all()
    latest = db.scalar(
        select(Campaign)
        .where(Campaign.business_id == user.business_id)
        .order_by(Campaign.created_at.desc(), Campaign.id.desc())
        .limit(1)
    )
    upcoming_out = [post_response(p) for p in upcoming]

    return SummaryResponse(
        business_name=user.business.name,
        owner_name=user.name,
        scheduled=scheduled,
        posted=posted,
        this_week=this_week,
        campaigns=db.scalar(campaigns),
        active_campaigns=db.scalar(
            campaigns.where(Campaign.status.in_(("building", "scheduled")))
        ),
        products=db.scalar(
            select(func.count(Product.id)).where(Product.business_id == user.business_id)
        ),
        next_post=upcoming_out[0] if upcoming_out else None,
        upcoming=upcoming_out,
        latest_campaign=campaign_summary(latest) if latest else None,
    )
