from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from fastapi import Depends

from app.adapters.llm import LLMError, LLMProvider, get_llm_provider
from app.main import create_app
from app.schemas.captions import CaptionRequest
from app.services.writer import _user_payload, generate_captions
from tests.stubs import StubLLMProvider, make_captions_payload

ALL_PLATFORMS = ["facebook", "instagram", "tiktok"]


def make_client(provider: LLMProvider) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_llm_provider] = lambda: provider
    return TestClient(app)


def make_request(**kwargs) -> CaptionRequest:
    defaults = {
        "product_name": "Kek Lapis Sarawak Premium",
        "price": Decimal("65.00"),
        "platforms": ALL_PLATFORMS,
    }
    defaults.update(kwargs)
    return CaptionRequest(**defaults)


class TestWriterService:
    def test_returns_captions_in_requested_order(self):
        stub = StubLLMProvider(make_captions_payload(list(reversed(ALL_PLATFORMS))))

        resp = generate_captions(make_request(), stub)

        assert [c.platform for c in resp.captions] == ALL_PLATFORMS
        assert resp.model == "stub-model"

    def test_drops_unrequested_platforms(self):
        payload = make_captions_payload(ALL_PLATFORMS + ["twitter"])
        stub = StubLLMProvider(payload)

        resp = generate_captions(make_request(), stub)

        assert [c.platform for c in resp.captions] == ALL_PLATFORMS

    def test_raises_when_platform_missing(self):
        stub = StubLLMProvider(make_captions_payload(["facebook"]))

        with pytest.raises(LLMError, match="did not return captions"):
            generate_captions(make_request(), stub)

    def test_raises_when_output_is_not_an_object(self):
        stub = StubLLMProvider(["not", "an", "object"])

        with pytest.raises(LLMError, match="non-object JSON"):
            generate_captions(make_request(), stub)

    def test_raises_when_no_valid_entries(self):
        stub = StubLLMProvider({"captions": [{"bogus": True}]})

        with pytest.raises(LLMError, match="did not return captions"):
            generate_captions(make_request(), stub)

    def test_prompt_payload_contains_only_owner_facts(self):
        stub = StubLLMProvider(make_captions_payload(ALL_PLATFORMS))
        request = make_request(price=None, note="Limited batch — ready 1 Dec")

        generate_captions(request, stub)

        facts = stub.calls[0]["user_payload"]["facts"]
        assert facts["product_name"] == "Kek Lapis Sarawak Premium"
        assert facts["price"] is None
        assert facts["note"] == "Limited batch — ready 1 Dec"
        assert set(facts) == {
            "product_name",
            "price",
            "note",
            "platforms",
            "stage",
            "language",
            "goal",
        }


class TestCaptionsEndpoint:
    def test_generate_returns_captions(self):
        client = make_client(StubLLMProvider(make_captions_payload(ALL_PLATFORMS)))

        res = client.post(
            "/captions/generate",
            json={
                "product_name": "Kek Lapis Sarawak Premium",
                "price": "65.00",
                "platforms": ALL_PLATFORMS,
            },
        )

        assert res.status_code == 200
        body = res.json()
        assert body["model"] == "stub-model"
        assert [c["platform"] for c in body["captions"]] == ALL_PLATFORMS
        assert body["captions"][2]["video_idea"] == "idea for tiktok"

    def test_validation_error_on_empty_platforms(self):
        client = make_client(StubLLMProvider(make_captions_payload(ALL_PLATFORMS)))

        res = client.post(
            "/captions/generate",
            json={"product_name": "Cake", "platforms": []},
        )

        assert res.status_code == 422

    def test_llm_error_maps_to_502(self):
        client = make_client(StubLLMProvider(error=LLMError("bad output")))

        res = client.post(
            "/captions/generate",
            json={"product_name": "Cake", "platforms": ["facebook"]},
        )

        assert res.status_code == 502
        assert "Caption generation failed" in res.json()["detail"]
