from datetime import timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.publisher import Publisher, get_publisher
from app.db import get_db
from app.deps import current_user
from app.models import AppUser, Campaign, Post, utcnow
from app.routers.campaigns import post_response
from app.schemas.campaigns import FeedPostResponse, PostResponse, PostUpdate
from app.services.posting import publish_post
from app.services.pipeline import HASHTAG_LIMITS, clean_hashtags
from app.services.planner import MYT

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[FeedPostResponse])
def list_posts(
    status_: Literal["draft", "scheduled", "posted", "failed"] | None = Query(
        default=None, alias="status"
    ),
    platform: Literal["facebook", "instagram", "tiktok"] | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> list[FeedPostResponse]:
    query = select(Post).join(Campaign).where(Campaign.business_id == user.business_id)
    if status_:
        query = query.where(Post.status == status_)
    if platform:
        query = query.where(Post.platform == platform)
    if status_ == "posted":
        query = query.order_by(Post.posted_at.desc(), Post.id.desc())
    else:
        query = query.order_by(Post.scheduled_at, Post.id)
    business_name = user.business.name
    return [
        FeedPostResponse(**post_response(p).model_dump(), business_name=business_name)
        for p in db.scalars(query.limit(limit))
    ]


def get_post(post_id: int, db: Session, user: AppUser) -> Post:
    post = db.get(Post, post_id)
    if post is None or post.campaign.business_id != user.business_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post


@router.patch("/{post_id}", response_model=PostResponse)
def update(
    post_id: int,
    body: PostUpdate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
) -> PostResponse:
    post = get_post(post_id, db, user)
    if post.status == "posted":
        raise HTTPException(status.HTTP_409_CONFLICT, "Post is already posted")
    if body.caption is not None:
        post.caption = body.caption.strip()
    if body.hashtags is not None:
        post.hashtags = clean_hashtags(body.hashtags, HASHTAG_LIMITS[post.platform])
    if body.scheduled_at is not None:
        when = body.scheduled_at
        if when.tzinfo is None:
            when = when.replace(tzinfo=MYT)
        post.scheduled_at = when.astimezone(timezone.utc)
    db.commit()
    return post_response(post)


@router.post("/{post_id}/publish-now", response_model=PostResponse)
def publish_now(
    post_id: int,
    db: Session = Depends(get_db),
    user: AppUser = Depends(current_user),
    publisher: Publisher = Depends(get_publisher),
) -> PostResponse:
    post = get_post(post_id, db, user)
    if post.status != "scheduled":
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Only scheduled posts can be posted (this one is {post.status})"
        )
    publish_post(db, post, publisher, utcnow())
    db.commit()
    return post_response(post)
