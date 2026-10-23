from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from openai import APIError
from sqlalchemy import select

from app.adapters.llm import LLMError, OpenRouterProvider, get_llm_provider
from app.config import Settings
from app.main import create_app
from app.models import ActivityLog, MediaAsset
from app.schemas.products import Understood
from tests.stubs import JPG_BYTES, PNG_BYTES, StubLLMProvider, make_understood_payload


@pytest.fixture()
def llm() -> StubLLMProvider:
    return StubLLMProvider(vision_response=make_understood_payload())


@pytest.fixture()
def api(llm) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_llm_provider] = lambda: llm
    return TestClient(app)


def add_product(api, **fields):
    data = {"name": "Kek Lapis Sarawak Premium", "price": "65", "note": "Limited batch"}
    data.update(fields)
    files = {"photo": ("cake.jpg", JPG_BYTES, "image/jpeg")}
    return api.post("/products", data=data, files=files)


class TestCreate:
    def test_creates_product_asset_and_activity(self, api, db):
        res = add_product(api)
        assert res.status_code == 201
        body = res.json()
        assert body["name"] == "Kek Lapis Sarawak Premium"
        assert body["price_myr"] == "65.00"
        assert body["note"] == "Limited batch"
        assert body["photo_url"].startswith("/media/original_")
        assert body["photo_url"].endswith(".jpg")
        assert body["understood"] is None
        assert body["understood_confirmed"] is False
        assert body["created_at"].endswith("Z")

        asset = db.scalar(select(MediaAsset))
        assert asset.kind == "original"
        assert asset.mime == "image/jpeg"
        with open(asset.path, "rb") as f:
            assert f.read() == JPG_BYTES
        # The saved photo is served under /media.
        assert api.get(body["photo_url"]).content == JPG_BYTES

        log = db.scalar(select(ActivityLog))
        assert log.action == "draft"
        assert log.summary == "Product added: Kek Lapis Sarawak Premium"
        assert log.actor == "Aisha Rahman"

    def test_price_and_note_are_optional(self, api):
        res = add_product(api, price="", note="")
        assert res.status_code == 201
        assert res.json()["price_myr"] is None
        assert res.json()["note"] is None

    def test_png_is_accepted(self, api):
        files = {"photo": ("cake.png", PNG_BYTES, "image/png")}
        res = api.post("/products", data={"name": "Kek"}, files=files)
        assert res.status_code == 201
        assert res.json()["photo_url"].endswith(".png")

    @pytest.mark.parametrize("price", ["-1", "abc", "1.234"])
    def test_rejects_bad_price(self, api, price):
        assert add_product(api, price=price).status_code == 422

    def test_rejects_long_name_and_note(self, api):
        assert add_product(api, name="x" * 81).status_code == 422
        assert add_product(api, note="x" * 141).status_code == 422
        assert add_product(api, name="   ").status_code == 422

    def test_rejects_missing_or_bad_photo(self, api):
        assert api.post("/products", data={"name": "Kek"}).status_code == 422
        files = {"photo": ("a.gif", b"GIF89a...", "image/gif")}
        assert api.post("/products", data={"name": "Kek"}, files=files).status_code == 422
        # Says jpeg but isn't one.
        files = {"photo": ("a.jpg", b"not an image", "image/jpeg")}
        assert api.post("/products", data={"name": "Kek"}, files=files).status_code == 422
        big = JPG_BYTES + b"x" * (10 * 1024 * 1024)
        files = {"photo": ("a.jpg", big, "image/jpeg")}
        assert api.post("/products", data={"name": "Kek"}, files=files).status_code == 422


class TestRead:
    def test_get_and_list_newest_first(self, api):
        first = add_product(api, name="First").json()
        second = add_product(api, name="Second").json()

        assert api.get(f"/products/{first['id']}").json()["name"] == "First"
        assert [p["id"] for p in api.get("/products").json()] == [second["id"], first["id"]]

    def test_missing_product_is_404(self, api):
        assert api.get("/products/999").status_code == 404
        assert api.post("/products/999/understand").status_code == 404
        res = api.patch("/products/999/understood", json={"attributes": []})
        assert res.status_code == 404


class TestUnderstand:
    def test_stores_result_and_logs(self, api, llm, db):
        pid = add_product(api).json()["id"]
        res = api.post(f"/products/{pid}/understand")
        assert res.status_code == 200
        body = res.json()
        assert body["understood"] == make_understood_payload()
        assert body["understood_model"] == "stub-vision-model"
        assert body["understood_confirmed"] is False

        call = llm.vision_calls[0]
        assert call["image_data_url"].startswith("data:image/jpeg;base64,")
        assert "Kek Lapis Sarawak Premium" in call["text"]

        actions = db.scalars(select(ActivityLog.action).order_by(ActivityLog.id)).all()
        assert actions == ["draft", "generated"]

    def test_result_is_cached_unless_forced(self, api, llm):
        pid = add_product(api).json()["id"]
        api.post(f"/products/{pid}/understand")
        api.post(f"/products/{pid}/understand")
        assert len(llm.vision_calls) == 1
        api.post(f"/products/{pid}/understand?force=true")
        assert len(llm.vision_calls) == 2

    def test_provider_failure_is_502(self, api, llm):
        pid = add_product(api).json()["id"]
        llm.error = LLMError("boom")
        res = api.post(f"/products/{pid}/understand")
        assert res.status_code == 502
        assert api.get(f"/products/{pid}").json()["understood"] is None

    def test_not_configured_is_503(self, monkeypatch):
        get_llm_provider.cache_clear()
        monkeypatch.setattr(
            "app.adapters.llm.get_settings", lambda: Settings(openrouter_api_key="")
        )
        api = TestClient(create_app())
        pid = add_product(api).json()["id"]
        assert api.post(f"/products/{pid}/understand").status_code == 503
        get_llm_provider.cache_clear()


class TestConfirm:
    def test_saves_cleaned_attributes(self, api):
        pid = add_product(api).json()["id"]
        api.post(f"/products/{pid}/understand")
        res = api.patch(
            f"/products/{pid}/understood",
            json={"attributes": [" golden top ", "golden top", "", "8 layers"]},
        )
        assert res.status_code == 200
        assert res.json()["confirmed_attributes"] == ["golden top", "8 layers"]
        assert res.json()["understood_confirmed"] is True

    def test_force_rerun_clears_confirmation(self, api):
        pid = add_product(api).json()["id"]
        api.patch(f"/products/{pid}/understood", json={"attributes": ["a"]})
        body = api.post(f"/products/{pid}/understand?force=true").json()
        assert body["understood_confirmed"] is False
        assert body["confirmed_attributes"] is None

    def test_rejects_too_long_attribute(self, api):
        pid = add_product(api).json()["id"]
        res = api.patch(f"/products/{pid}/understood", json={"attributes": ["x" * 61]})
        assert res.status_code == 422


class TestUnderstoodSchema:
    def test_trims_to_six_chips(self):
        data = make_understood_payload()
        data["visible_attributes"] = [f"chip {i}" for i in range(9)]
        assert len(Understood.model_validate(data).visible_attributes) == 6

    def test_requires_attributes(self):
        data = make_understood_payload()
        data["visible_attributes"] = ["  "]
        with pytest.raises(ValueError):
            Understood.model_validate(data)


class FakeCompletions:
    """Stands in for client.chat.completions; one canned outcome per model."""

    def __init__(self, outcomes: dict):
        self.outcomes = outcomes
        self.models: list[str] = []

    def create(self, *, model, **kwargs):
        self.models.append(model)
        outcome = self.outcomes[model]
        if isinstance(outcome, Exception):
            raise outcome
        message = SimpleNamespace(content=outcome)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def make_provider(outcomes: dict) -> tuple[OpenRouterProvider, FakeCompletions]:
    settings = Settings(
        openrouter_api_key="test",
        llm_model_vision="model-a",
        llm_model_vision_fallbacks="model-b, model-c",
    )
    provider = OpenRouterProvider(settings)
    fake = FakeCompletions(outcomes)
    provider._vision_client = SimpleNamespace(chat=SimpleNamespace(completions=fake))
    return provider, fake


class TestVisionFallback:
    good = '{"product_type": "cake", "visible_attributes": ["layered"], "uncertain": []}'

    def test_falls_back_on_error_and_bad_json(self):
        error = APIError("rate limited", request=None, body=None)
        provider, fake = make_provider(
            {"model-a": error, "model-b": "not json", "model-c": f"```json\n{self.good}\n```"}
        )
        result, model = provider.vision_json("sys", "text", "data:x", Understood.model_validate)
        assert model == "model-c"
        assert result.visible_attributes == ["layered"]
        assert fake.models == ["model-a", "model-b", "model-c"]

    def test_falls_back_on_invalid_shape(self):
        provider, fake = make_provider({"model-a": '{"foo": 1}', "model-b": self.good})
        _, model = provider.vision_json("sys", "text", "data:x", Understood.model_validate)
        assert model == "model-b"

    def test_raises_when_all_fail(self):
        provider, _ = make_provider({"model-a": "x", "model-b": "y", "model-c": "z"})
        with pytest.raises(LLMError, match="All vision models failed"):
            provider.vision_json("sys", "text", "data:x", Understood.model_validate)
