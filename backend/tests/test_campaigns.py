from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.adapters.llm import get_llm_provider
from app.adapters.media import MediaError
from app.config import get_settings
from app.main import create_app
from app.models import ActivityLog, MediaAsset, Post
from app.routers.campaigns import pipeline_media
from app.schemas.campaigns import ScheduleIn
from app.services import pipeline
from app.services.pipeline import tidy_post
from app.services.planner import PlanError, plan_posts
from tests.stubs import (
    JPG_BYTES,
    StubLLMProvider,
    StubMediaProvider,
    make_understood_payload,
)

ALL = ["facebook", "instagram", "tiktok"]
NOW = datetime(2026, 10, 24, 17, 0, tzinfo=timezone.utc)  # Sun 25 Oct 01:00 MYT


def captions_reply(payload: dict) -> dict:
    """Stub caption model: one post per requested id."""
    return {
        "posts": [
            {
                "id": p["id"],
                "caption": f"{p['stage']} post for {p['platform']} RM65 #Kek",
                "hashtags": ["#KKKopitiam", "KekLapis", "#kek lapis"],
                "video_idea": "Slice the cake slowly" if p["platform"] == "tiktok" else None,
            }
            for p in payload["posts"]
        ]
    }


@pytest.fixture()
def llm() -> StubLLMProvider:
    return StubLLMProvider(
        vision_response=make_understood_payload(), text_response=captions_reply
    )


@pytest.fixture()
def media() -> StubMediaProvider | None:
    return None


@pytest.fixture()
def api(llm, media) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_llm_provider] = lambda: llm
    app.dependency_overrides[pipeline_media] = lambda: media
    return TestClient(app)


def add_product(api, price="65", understand=True) -> int:
    res = api.post(
        "/products",
        data={"name": "Kek Lapis Sarawak Premium", "price": price, "note": "Ready 1 Dec"},
        files={"photo": ("cake.jpg", JPG_BYTES, "image/jpeg")},
    )
    assert res.status_code == 201
    product_id = res.json()["id"]
    if not understand:
        return product_id
    api.post(f"/products/{product_id}/understand")
    api.patch(f"/products/{product_id}/understood", json={"attributes": ["layered"]})
    return product_id


def start_campaign(api, product_id, **schedule):
    schedule = {"mode": "launch_sequence", "dates": ["2030-11-01"], "time": "20:00"} | schedule
    return api.post(
        "/campaigns",
        json={
            "product_id": product_id,
            "language": "mixed",
            "platforms": ALL,
            "schedule": schedule,
        },
    )


class TestPlanner:
    def test_launch_sequence_days_and_utc(self):
        schedule = ScheduleIn(mode="launch_sequence", start_date=date(2026, 11, 1), time="20:00")
        posts = plan_posts(schedule, ALL, NOW)

        assert len(posts) == 12
        by_stage = {p.stage: p.scheduled_at for p in posts if p.platform == "instagram"}
        # 20:00 Malaysia time is 12:00 UTC.
        assert by_stage == {
            "teaser": datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc),
            "launch": datetime(2026, 11, 3, 12, 0, tzinfo=timezone.utc),
            "reminder": datetime(2026, 11, 6, 12, 0, tzinfo=timezone.utc),
            "last_chance": datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc),
        }
        assert all(p.why_this_time for p in posts)

    def test_start_defaults_to_tomorrow_in_malaysia(self):
        posts = plan_posts(ScheduleIn(mode="launch_sequence"), ["facebook"], NOW)
        # Now is already the 25th in Malaysia, so tomorrow is the 26th.
        assert posts[0].scheduled_at == datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)

    def test_dates_from_wizard_set_start(self):
        schedule = ScheduleIn(mode="launch_sequence", dates=[date(2026, 12, 1)], time="09:30")
        posts = plan_posts(schedule, ["facebook"], NOW)
        assert posts[0].scheduled_at == datetime(2026, 12, 1, 1, 30, tzinfo=timezone.utc)

    def test_weekly(self):
        # 26 Oct 2026 is a Monday.
        schedule = ScheduleIn(
            mode="weekly", start_date=date(2026, 10, 26), days=["Thu", "Tue"], weeks=2
        )
        posts = plan_posts(schedule, ["facebook", "tiktok"], NOW)

        days = sorted({p.scheduled_at.date() for p in posts})
        assert days == [date(2026, 10, 27), date(2026, 10, 29), date(2026, 11, 3), date(2026, 11, 5)]
        assert len(posts) == 8
        assert all(p.stage is None for p in posts)

    def test_weekly_skips_past_times(self):
        schedule = ScheduleIn(mode="weekly", start_date=date(2026, 10, 19), days=["Mon"], weeks=2)
        posts = plan_posts(schedule, ["facebook"], NOW)
        assert [p.scheduled_at.date() for p in posts] == [date(2026, 10, 26)]

    def test_weekly_needs_days(self):
        with pytest.raises(ValueError):
            ScheduleIn(mode="weekly")

    def test_custom_slots_and_dates(self):
        schedule = ScheduleIn(
            mode="custom",
            slots=["2026-11-02T13:00:00", "2026-11-03T05:00:00Z"],
            dates=[date(2026, 11, 4)],
            time="21:00",
        )
        posts = plan_posts(schedule, ["instagram"], NOW)
        assert [p.scheduled_at for p in posts] == [
            datetime(2026, 11, 2, 5, 0, tzinfo=timezone.utc),  # naive = Malaysia time
            datetime(2026, 11, 3, 5, 0, tzinfo=timezone.utc),
            datetime(2026, 11, 4, 13, 0, tzinfo=timezone.utc),
        ]

    def test_too_many_posts(self):
        schedule = ScheduleIn(
            mode="weekly", start_date=date(2026, 10, 26),
            days=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], weeks=2,
        )
        with pytest.raises(PlanError):
            plan_posts(schedule, ALL, NOW)


class TestTidyPost:
    def test_moves_hashtags_and_strips_price_when_none(self):
        caption, tags = tidy_post(
            "Sedap! Only RM65 (RM 70.00) today.\n#KekLapis #Sedap", ["#Kek"], "tiktok", None
        )
        assert caption == "Sedap! Only today."
        assert tags == ["#Kek", "#KekLapis", "#Sedap"]

    def test_fixes_wrong_price(self):
        caption, _ = tidy_post("Now RM60 only", [], "facebook", Decimal("65.00"))
        assert caption == "Now RM65 only"

    def test_hashtag_limit_and_cleanup(self):
        tags = [f"#tag{i}" for i in range(20)] + ["#Tag1", "bad tag!"]
        _, out = tidy_post("Hi", tags, "instagram", None)
        assert len(out) == 10
        _, out = tidy_post("Hi", ["#a", "#A", "b c"], "facebook", None)
        assert out == ["#a", "#bc"]


class TestBuild:
    def test_happy_path_passthrough(self, api, llm, db):
        product_id = add_product(api)
        res = start_campaign(api, product_id)
        assert res.status_code == 202
        assert res.json()["status"] == "building"
        assert len(res.json()["posts"]) == 12

        body = api.get(f"/campaigns/{res.json()['id']}").json()
        assert body["status"] == "scheduled"
        assert set(body["progress"]) == {"understand", "images", "captions"}
        for step in body["progress"].values():
            assert step["state"] == "done"
            assert step["started_at"].endswith("Z") and step["finished_at"]
        # passthrough leaves a visible note on the images step only.
        assert body["progress"]["understand"]["error"] is None
        assert body["progress"]["captions"]["error"] is None
        assert "original photo" in body["progress"]["images"]["error"]
        assert body["product"]["understood"]["product_type"] == "layered cake"

        post = body["posts"][0]
        assert post["status"] == "scheduled"
        assert post["image_url"] == body["product"]["photo_url"]
        assert post["uses_original_image"] is True
        assert post["caption"] == "teaser post for facebook RM65"
        assert post["hashtags"] == ["#KKKopitiam", "#KekLapis", "#Kek"]
        assert post["scheduled_at"] == "2030-11-01T12:00:00Z"
        tiktok = [p for p in body["posts"] if p["platform"] == "tiktok"]
        assert all(p["video_idea"] == "Slice the cake slowly" for p in tiktok)
        assert all(p["video_idea"] is None for p in body["posts"] if p["platform"] != "tiktok")

        # One vision call and one caption call for the whole campaign.
        assert len(llm.vision_calls) == 1
        assert len(llm.text_calls) == 1
        payload = llm.text_calls[0]["user_payload"]
        assert payload["facts"]["price_myr"] == "65"
        assert payload["facts"]["seen_in_photo"] == ["layered"]
        assert len(payload["posts"]) == 12

        actions = [(a.action, a.summary) for a in db.scalars(select(ActivityLog))]
        assert ("draft", "Campaign started for Kek Lapis Sarawak Premium") in actions
        assert ("generated", "12 captions written for Kek Lapis Sarawak Premium") in actions

    def test_runs_vision_when_missing(self, api, llm):
        product_id = add_product(api, understand=False)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()
        assert len(llm.vision_calls) == 1
        assert body["product"]["understood"] is not None
        assert body["status"] == "scheduled"
        assert llm.text_calls[0]["user_payload"]["facts"]["seen_in_photo"] == []

    def test_no_price_strips_rm(self, api):
        product_id = add_product(api, price="")
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()
        assert all("RM" not in p["caption"] for p in body["posts"])

    def test_images_step_notes_passthrough_skip(self, api):
        # No media provider + passthrough: the build finishes instantly with
        # the original photo, and the images step says why instead of just
        # flashing "done" in ~0s.
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()

        assert body["status"] == "scheduled"
        images = body["progress"]["images"]
        assert images["state"] == "done"
        assert "original photo" in images["error"]
        assert all(p["uses_original_image"] for p in body["posts"])

    def test_live_mode_without_key_says_so(self, api, monkeypatch):
        # MEDIA_MODE=live but no usable provider (dependency returns None):
        # the images step must say the key is the problem, not flash "done".
        settings = get_settings().model_copy(update={"media_mode": "live"})
        monkeypatch.setattr(pipeline, "get_settings", lambda: settings)
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()

        assert body["status"] == "scheduled"
        assert body["progress"]["images"]["state"] == "done"
        assert "API key is missing or invalid" in body["progress"]["images"]["error"]

    def test_list_campaigns(self, api):
        product_id = add_product(api)
        start_campaign(api, product_id)
        start_campaign(api, product_id)
        rows = api.get("/campaigns").json()
        assert [r["id"] for r in rows] == [2, 1]
        assert rows[0]["product_name"] == "Kek Lapis Sarawak Premium"
        assert rows[0]["posts_total"] == 12
        assert rows[0]["posts_scheduled"] == 12
        assert rows[0]["first_post_at"] == "2030-11-01T12:00:00Z"
        assert rows[0]["cover_url"].startswith("/media/")

    def test_bad_requests(self, api):
        assert start_campaign(api, 999).status_code == 404
        product_id = add_product(api)
        res = api.post(
            "/campaigns",
            json={"product_id": product_id, "platforms": [], "schedule": {"mode": "weekly"}},
        )
        assert res.status_code == 422

    def test_caption_failure_fails_campaign(self, api, llm, db):
        llm.text_response = {"posts": []}
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()

        assert body["status"] == "failed"
        assert body["progress"]["captions"]["state"] == "failed"
        assert "skipped posts" in body["progress"]["captions"]["error"]
        assert body["error"].startswith("captions failed")
        assert all(p["status"] == "failed" for p in body["posts"])


class TestLiveMedia:
    @pytest.fixture()
    def media(self) -> StubMediaProvider:
        return StubMediaProvider()

    def test_enhance_and_stage_images(self, api, media, db):
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()

        assert body["status"] == "scheduled"
        kinds = [s["kind"] for s in media.submissions]
        assert kinds == ["enhance"] + ["poster-image"] * 4
        assert len(media.uploads) == 2  # original, then the enhanced photo once

        assets = {a.stage: a for a in db.scalars(select(MediaAsset).where(MediaAsset.kind == "stage"))}
        enhanced = db.scalar(select(MediaAsset).where(MediaAsset.kind == "enhanced"))
        assert set(assets) == {"teaser", "launch", "reminder", "last_chance"}
        assert all(a.parent_asset_id == enhanced.id for a in assets.values())
        for post in body["posts"]:
            assert post["image_url"] == assets[post["stage"]].url
            assert post["uses_original_image"] is False
        summaries = [a.summary for a in db.scalars(select(ActivityLog))]
        assert "4 images made for Kek Lapis Sarawak Premium" in summaries

    def test_weekly_uses_enhanced_only(self, api, media, db):
        product_id = add_product(api)
        campaign = start_campaign(
            api, product_id, mode="weekly", days=["Mon"], weeks=1, dates=["2030-11-04"]
        ).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()
        assert [s["kind"] for s in media.submissions] == ["enhance"]
        enhanced = db.scalar(select(MediaAsset).where(MediaAsset.kind == "enhanced"))
        assert {p["image_url"] for p in body["posts"]} == {enhanced.url}

    def test_media_failure_falls_back_to_original(self, api, media):
        media.error = MediaError("YouCam down")
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        body = api.get(f"/campaigns/{campaign['id']}").json()

        assert body["status"] == "scheduled"
        assert body["progress"]["images"]["state"] == "done"
        assert "YouCam down" in body["progress"]["images"]["error"]
        assert all(p["uses_original_image"] for p in body["posts"])
        assert all(p["image_url"] == body["product"]["photo_url"] for p in body["posts"])

    def test_image_choice_switch_between_original_and_ai(self, api, media, db):
        product_id = add_product(api)
        cid = start_campaign(api, product_id).json()["id"]

        # Built with AI images; switching to the original re-points every post.
        res = api.post(f"/campaigns/{cid}/image-choice", json={"use_original_image": True})
        assert res.status_code == 200
        body = res.json()
        assert all(p["uses_original_image"] for p in body["posts"])
        assert all(p["image_url"] == body["product"]["photo_url"] for p in body["posts"])

        # Back to the AI images: each stage gets its own image again.
        res = api.post(f"/campaigns/{cid}/image-choice", json={"use_original_image": False})
        assert res.status_code == 200
        body = res.json()
        stage_assets = {
            a.stage: a
            for a in db.scalars(select(MediaAsset).where(MediaAsset.kind == "stage"))
        }
        for p in body["posts"]:
            assert p["uses_original_image"] is False
            assert p["image_url"] == stage_assets[p["stage"]].url


class TestPostsAndCalendar:
    def test_patch_post(self, api, db):
        product_id = add_product(api)
        campaign = start_campaign(api, product_id).json()
        post_id = campaign["posts"][0]["id"]

        res = api.patch(
            f"/posts/{post_id}",
            json={"caption": " New text ", "hashtags": ["kek", "#Kek"], "scheduled_at": "2030-11-02T21:00:00"},
        )
        assert res.status_code == 200
        assert res.json()["caption"] == "New text"
        assert res.json()["hashtags"] == ["#kek"]
        assert res.json()["scheduled_at"] == "2030-11-02T13:00:00Z"

        post = db.get(Post, post_id)
        post.status = "posted"
        db.commit()
        assert api.patch(f"/posts/{post_id}", json={"caption": "x"}).status_code == 409
        assert api.patch("/posts/999", json={"caption": "x"}).status_code == 404

    def test_calendar_range(self, api):
        product_id = add_product(api)
        start_campaign(api, product_id)
        # Teaser 1 Nov, launch 3 Nov, reminder 6 Nov, last chance 8 Nov.
        res = api.get("/calendar", params={"from": "2030-11-01", "to": "2030-11-03"})
        assert res.status_code == 200
        posts = res.json()
        assert len(posts) == 6
        assert {p["stage"] for p in posts} == {"teaser", "launch"}
        assert posts[0]["product_name"] == "Kek Lapis Sarawak Premium"
        assert posts[0]["image_url"].startswith("/media/")
        assert api.get("/calendar", params={"from": "2030-11-09"}).json() == []
        assert api.get("/calendar", params={"from": "2030-11-09", "to": "2030-11-01"}).status_code == 422


class TestImageChoice:
    """POST /campaigns/{id}/image-choice — original photo vs AI image."""

    def test_ai_choice_without_ai_image_conflicts(self, api, db):
        # media fixture defaults to None, so the build never made an AI image.
        product_id = add_product(api)
        cid = start_campaign(api, product_id).json()["id"]

        res = api.post(f"/campaigns/{cid}/image-choice", json={"use_original_image": False})
        assert res.status_code == 409

        res = api.post(f"/campaigns/{cid}/image-choice", json={"use_original_image": True})
        assert res.status_code == 200
        assert all(p["uses_original_image"] for p in res.json()["posts"])

    def test_unknown_campaign_404(self, api):
        res = api.post("/campaigns/999/image-choice", json={"use_original_image": True})
        assert res.status_code == 404
