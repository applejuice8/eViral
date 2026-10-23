from decimal import Decimal

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.deps import current_user
from app.models import (
    ActivityLog,
    AppUser,
    Business,
    Campaign,
    MediaAsset,
    Post,
    Product,
    empty_progress,
)
from app.seed import ensure_owner
from app.services.activity import log_activity


def test_ensure_owner_seeds_business_and_owner_once(db):
    owner = ensure_owner(db)
    again = ensure_owner(db)

    assert owner.id == again.id
    assert owner.name == "Aisha Rahman"
    assert owner.business.name == "Kek Kak Nora"
    assert owner.business.halal_certified is True
    assert owner.business.languages == ["ms", "en"]
    assert db.scalar(select(func.count()).select_from(Business)) == 1
    assert db.scalar(select(func.count()).select_from(AppUser)) == 1


def test_current_user_dependency_returns_owner():
    app = FastAPI()

    @app.get("/me")
    def me(user: AppUser = Depends(current_user)):
        return {"name": user.name}

    res = TestClient(app).get("/me")
    assert res.status_code == 200
    assert res.json() == {"name": "Aisha Rahman"}


def test_campaign_with_posts_round_trip(db):
    owner = ensure_owner(db)
    photo = MediaAsset(
        business_id=owner.business_id,
        kind="original",
        path="media/cake.jpg",
        url="/media/cake.jpg",
        mime="image/jpeg",
        provider="upload",
    )
    db.add(photo)
    db.flush()
    product = Product(
        business_id=owner.business_id,
        name="Kek Lapis Sarawak Premium",
        price_myr=Decimal("65.00"),
        original_asset_id=photo.id,
    )
    db.add(product)
    db.flush()
    campaign = Campaign(
        business_id=owner.business_id,
        product_id=product.id,
        language="ms",
        platforms=["facebook", "instagram"],
        schedule={"mode": "launch_sequence", "time": "20:00", "start_date": "2026-11-01"},
    )
    db.add(campaign)
    db.flush()
    db.add(Post(campaign_id=campaign.id, platform="facebook", stage="teaser"))
    db.commit()
    db.expire_all()

    saved = db.get(Campaign, campaign.id)
    assert saved.status == "building"
    assert saved.progress == empty_progress()
    assert saved.product.price_myr == Decimal("65.00")
    assert saved.product.understood_confirmed is False
    assert [p.status for p in saved.posts] == ["draft"]
    assert saved.posts[0].hashtags == []


def test_log_activity_rejects_unknown_action(db):
    with pytest.raises(ValueError):
        log_activity(db, action="approved", entity_type="post", entity_id=1,
                     summary="x", actor="system")

    log_activity(db, action="draft", entity_type="product", entity_id=1,
                 summary="Product added: Kek", actor="Aisha Rahman")
    db.commit()
    assert db.scalar(select(ActivityLog.summary)) == "Product added: Kek"
