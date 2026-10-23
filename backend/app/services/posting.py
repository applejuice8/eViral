"""Posting due posts (scheduler tick) and posting one post right away."""

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.publisher import MockPublisher, Publisher
from app.db import SessionLocal
from app.models import Campaign, Post, utcnow
from app.services.activity import log_activity
from app.services.products import AI_ACTOR

logger = logging.getLogger(__name__)

PLATFORM_LABELS = {"facebook": "Facebook", "instagram": "Instagram", "tiktok": "TikTok"}
STAGE_LABELS = {
    "teaser": "teaser",
    "launch": "launch",
    "reminder": "reminder",
    "last_chance": "last chance",
}


def publish_post(db: Session, post: Post, publisher: Publisher, now: datetime) -> Post:
    """Post it, log it, and close the campaign when every post is out. Caller commits."""
    post.published_url = publisher.publish(post)
    post.status = "posted"
    post.posted_at = now
    post.error = None

    campaign = post.campaign
    product = campaign.product
    summary = f"Posted to {PLATFORM_LABELS[post.platform]}: {product.name}"
    if post.stage:
        summary += f" ({STAGE_LABELS[post.stage]})"
    log_activity(
        db,
        action="posted",
        entity_type="post",
        entity_id=post.id,
        summary=summary,
        actor=AI_ACTOR,
        business_id=campaign.business_id,
        detail={"campaign_id": campaign.id, "platform": post.platform, "url": post.published_url},
    )
    if all(p.status == "posted" for p in campaign.posts):
        campaign.status = "done"
    return post


def tick(db: Session, publisher: Publisher, now: datetime | None = None) -> int:
    """Post every scheduled post that is due. Returns how many were posted."""
    now = now or utcnow()
    due = db.scalars(
        select(Post)
        .join(Campaign)
        .where(Post.status == "scheduled", Post.scheduled_at <= now)
        .order_by(Post.scheduled_at, Post.id)
    ).all()
    for post in due:
        publish_post(db, post, publisher, now)
    db.commit()
    return len(due)


def run_tick() -> None:
    """Scheduler job; uses its own db session."""
    try:
        with SessionLocal() as db:
            count = tick(db, MockPublisher())
        if count:
            logger.info("Posted %s due post(s)", count)
    except Exception:
        logger.exception("Scheduler tick failed")
