from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.adapters.llm import get_llm_provider
from app.adapters.publisher import MockPublisher
from app.config import get_settings
from app.main import create_app
from app.models import ActivityLog, Campaign, Post, utcnow
from app.routers.campaigns import pipeline_media
from app.services.posting import tick
from tests.stubs import StubLLMProvider, make_understood_payload
from tests.test_campaigns import add_product, captions_reply, start_campaign


@pytest.fixture()
def api() -> TestClient:
    llm = StubLLMProvider(vision_response=make_understood_payload(), text_response=captions_reply)
    app = create_app()
    app.dependency_overrides[get_llm_provider] = lambda: llm
    app.dependency_overrides[pipeline_media] = lambda: None
    return TestClient(app)


@pytest.fixture()
def campaign(api) -> dict:
    product_id = add_product(api)
    created = start_campaign(api, product_id).json()
    return api.get(f"/campaigns/{created['id']}").json()


def move_to_past(db, *post_ids: int) -> None:
    for post_id in post_ids:
        db.get(Post, post_id).scheduled_at = utcnow() - timedelta(minutes=1)
    db.commit()


class TestTick:
    def test_posts_only_due_posts(self, api, campaign, db):
        ids = [p["id"] for p in campaign["posts"]]
        move_to_past(db, ids[0], ids[1])

        assert tick(db, MockPublisher()) == 2
        db.expire_all()
        posted = db.scalars(select(Post).where(Post.status == "posted")).all()
        assert {p.id for p in posted} == {ids[0], ids[1]}
        assert posted[0].posted_at is not None
        assert posted[0].published_url == f"/{posted[0].platform}#post-{posted[0].id}"
        assert db.get(Campaign, campaign["id"]).status == "scheduled"

        logs = db.scalars(select(ActivityLog).where(ActivityLog.action == "posted")).all()
        assert [l.summary for l in logs] == [
            "Posted to Facebook: Kek Lapis Sarawak Premium (teaser)",
            "Posted to Instagram: Kek Lapis Sarawak Premium (teaser)",
        ]
        # Nothing left that is due.
        assert tick(db, MockPublisher()) == 0

    def test_campaign_done_when_all_posted(self, api, campaign, db):
        move_to_past(db, *[p["id"] for p in campaign["posts"]])
        assert tick(db, MockPublisher()) == 12
        db.expire_all()
        assert db.get(Campaign, campaign["id"]).status == "done"

    def test_draft_posts_are_not_posted(self, api, campaign, db):
        post = db.get(Post, campaign["posts"][0]["id"])
        post.status = "draft"
        post.scheduled_at = utcnow() - timedelta(minutes=1)
        db.commit()
        assert tick(db, MockPublisher()) == 0

    def test_internal_tick_endpoint(self, api, campaign, db, monkeypatch):
        move_to_past(db, campaign["posts"][0]["id"])
        monkeypatch.setattr(get_settings(), "internal_tick_secret", "s3cret")
        assert api.post("/internal/tick").status_code == 403
        res = api.post("/internal/tick", headers={"X-Tick-Secret": "s3cret"})
        assert res.json() == {"posted": 1}

    def test_internal_tick_open_without_secret(self, api):
        assert api.post("/internal/tick").json() == {"posted": 0}


class TestPublishNow:
    def test_publish_now(self, api, campaign):
        post_id = campaign["posts"][2]["id"]
        res = api.post(f"/posts/{post_id}/publish-now")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "posted"
        assert body["posted_at"].endswith("Z")
        assert body["published_url"].endswith(f"#post-{post_id}")
        assert api.post(f"/posts/{post_id}/publish-now").status_code == 409
        assert api.post("/posts/999/publish-now").status_code == 404


class TestReads:
    def test_activity(self, api, campaign):
        api.post(f"/posts/{campaign['posts'][0]['id']}/publish-now")
        rows = api.get("/activity").json()
        assert rows[0]["action"] == "posted"
        assert rows[0]["created_at"].endswith("Z")
        assert {r["action"] for r in rows} == {"draft", "generated", "posted"}
        only = api.get("/activity", params={"action": "draft", "limit": 1}).json()
        assert len(only) == 1 and only[0]["action"] == "draft"
        assert api.get("/activity", params={"action": "approved"}).status_code == 422

    def test_posts_feed(self, api, campaign):
        first, second = campaign["posts"][0]["id"], campaign["posts"][3]["id"]
        api.post(f"/posts/{first}/publish-now")
        api.post(f"/posts/{second}/publish-now")

        rows = api.get("/posts", params={"status": "posted"}).json()
        assert [r["id"] for r in rows] == [second, first]
        assert rows[0]["business_name"] == "Kek Kak Nora"
        assert rows[0]["product_name"] == "Kek Lapis Sarawak Premium"
        assert rows[0]["caption"] and rows[0]["hashtags"] and rows[0]["image_url"]

        fb = api.get("/posts", params={"status": "posted", "platform": "facebook"}).json()
        assert [r["platform"] for r in fb] == ["facebook", "facebook"]
        assert len(api.get("/posts", params={"limit": 3}).json()) == 3

    def test_summary(self, api, campaign, db):
        # Put two posts in this week (Malaysia time) and post one.
        ids = [p["id"] for p in campaign["posts"]]
        for post_id in ids[:2]:
            db.get(Post, post_id).scheduled_at = utcnow() + timedelta(minutes=5)
        db.commit()
        api.post(f"/posts/{ids[0]}/publish-now")

        body = api.get("/summary").json()
        assert body["business_name"] == "Kek Kak Nora"
        assert body["owner_name"] == "Aisha Rahman"
        assert body["scheduled"] == 11
        assert body["posted"] == 1
        assert body["campaigns"] == 1
        assert body["active_campaigns"] == 1
        assert body["products"] == 1
        assert body["next_post"]["id"] == ids[1]
        assert len(body["upcoming"]) == 5
        assert body["latest_campaign"]["id"] == campaign["id"]
        # The posted one counts; the other is this week unless the week ends within 5 minutes.
        assert body["this_week"] >= 1

    def test_summary_empty(self, api):
        body = api.get("/summary").json()
        assert body["scheduled"] == 0
        assert body["next_post"] is None
        assert body["latest_campaign"] is None
