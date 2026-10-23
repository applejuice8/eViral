from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user
from app.models import AppUser, Post
from app.routers.campaigns import post_response
from app.schemas.campaigns import PostResponse, PostUpdate
from app.services.pipeline import HASHTAG_LIMITS, clean_hashtags
from app.services.planner import MYT

router = APIRouter(prefix="/posts", tags=["posts"])


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
    """Edit a post's caption, hashtags or time. Posted posts can't change."""
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
