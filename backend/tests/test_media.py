import pytest
from fastapi.testclient import TestClient

from app.adapters.media import (
    MediaError,
    MediaNotConfiguredError,
    get_media_provider,
)
from app.config import Settings
from app.main import create_app
from app.services.media import (
    change_background,
    enhance_image,
    generate_poster_from_image,
    parse_image_to_image_size,
    validate_image,
)
from tests.stubs import JPG_BYTES, PNG_BYTES, StubMediaProvider

BIG_JPG = b"\xff\xd8" + b"x" * (10 * 1024 * 1024 + 1)


def make_client(provider: StubMediaProvider) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_media_provider] = lambda: provider
    return TestClient(app)


def make_settings(tmp_path) -> Settings:
    return Settings(media_dir=str(tmp_path), database_url="sqlite:///:memory:")


# -- input validation --------------------------------------------------------


class TestValidation:
    def test_rejects_empty_image(self):
        with pytest.raises(MediaError, match="empty"):
            validate_image(b"", "image/jpeg")

    def test_rejects_wrong_content_type(self):
        with pytest.raises(MediaError, match="unsupported image type"):
            validate_image(b"data", "image/webp")

    def test_rejects_oversized_image(self):
        with pytest.raises(MediaError, match="10MB"):
            validate_image(BIG_JPG, "image/jpeg")

    def test_accepts_jpg_jpeg_png_and_returns_ext(self):
        assert validate_image(JPG_BYTES, "image/jpeg") == ".jpg"
        assert validate_image(JPG_BYTES, "image/jpg") == ".jpg"
        assert validate_image(PNG_BYTES, "image/png") == ".png"

    def test_image_to_image_size_bounds(self):
        assert parse_image_to_image_size("1024*1024") == "1024*1024"
        assert parse_image_to_image_size("1080*1920") == "1080*1920"
        for bad in ("100*100", "4096*1024", "1024x1024", "huge"):
            with pytest.raises(MediaError):
                parse_image_to_image_size(bad)


# -- service orchestration ---------------------------------------------------


class TestService:
    def test_enhance_with_upload_runs_full_flow(self, tmp_path):
        provider = StubMediaProvider()
        settings = make_settings(tmp_path)

        resp = enhance_image(
            provider,
            image=JPG_BYTES,
            content_type="image/jpeg",
            scale=2,
            base_url="http://testserver/",
            settings=settings,
        )

        # Upload: bytes went through the File API with a normalized type.
        assert provider.uploads[0]["data"] == JPG_BYTES
        assert provider.uploads[0]["content_type"] == "image/jpeg"
        # Task: submitted with the uploaded file id and requested scale.
        assert provider.submissions[0]["kind"] == "enhance"
        assert provider.submissions[0]["src_file_id"] == "stub-file-id"
        assert provider.submissions[0]["scale"] == 2
        # Result: downloaded and persisted locally.
        stored = tmp_path / resp.file_name
        assert stored.read_bytes() == PNG_BYTES
        assert resp.kind == "enhanced"
        assert resp.url == f"http://testserver/media/{resp.file_name}"
        assert resp.url.endswith(".png")  # sniffed from magic bytes

    def test_enhance_with_public_url_skips_upload(self, tmp_path):
        provider = StubMediaProvider()

        resp = enhance_image(
            provider,
            image_url="https://example.com/cake.jpg",
            settings=make_settings(tmp_path),
        )

        assert provider.uploads == []
        assert provider.submissions[0]["src_file_url"] == "https://example.com/cake.jpg"
        assert resp.source == "url"

    def test_source_conflict_and_missing(self, tmp_path):
        provider = StubMediaProvider()
        settings = make_settings(tmp_path)

        with pytest.raises(MediaError, match="not both"):
            enhance_image(
                provider,
                image=JPG_BYTES,
                content_type="image/jpeg",
                image_url="https://example.com/cake.jpg",
                settings=settings,
            )
        with pytest.raises(MediaError, match="image file or an image_url"):
            enhance_image(provider, settings=settings)

    def test_poster_from_image_requires_prompt(self, tmp_path):
        with pytest.raises(MediaError, match="prompt"):
            generate_poster_from_image(
                StubMediaProvider(),
                image=JPG_BYTES,
                content_type="image/jpeg",
                settings=make_settings(tmp_path),
            )

    def test_poster_from_image_submits_ids_and_size(self, tmp_path):
        provider = StubMediaProvider()

        resp = generate_poster_from_image(
            provider,
            image=JPG_BYTES,
            content_type="image/jpeg",
            prompt="festive table, warm light",
            size="1024*1024",
            settings=make_settings(tmp_path),
        )

        sub = provider.submissions[0]
        assert sub["kind"] == "poster-image"
        assert sub["src_file_ids"] == ["stub-file-id"]
        assert sub["prompt"] == "festive table, warm light"
        assert sub["size"] == "1024*1024"
        assert resp.kind == "poster"
        assert resp.model == settings_model()

    def test_background_with_template_ignores_prompt(self, tmp_path):
        provider = StubMediaProvider()

        change_background(
            provider,
            image=JPG_BYTES,
            content_type="image/jpeg",
            prompt="ignored",
            template_id="nature_cherryblossom",
            settings=make_settings(tmp_path),
        )

        sub = provider.submissions[0]
        assert sub["kind"] == "background"
        assert sub["template_id"] == "nature_cherryblossom"

    def test_provider_error_propagates(self, tmp_path):
        provider = StubMediaProvider(error=MediaError("boom"))

        with pytest.raises(MediaError, match="boom"):
            enhance_image(
                provider,
                image=JPG_BYTES,
                content_type="image/jpeg",
                settings=make_settings(tmp_path),
            )


def settings_model() -> str:
    from app.config import get_settings

    return get_settings().youcam_image_model


# -- endpoints ---------------------------------------------------------------


class TestMediaEndpoints:
    def test_enhance_endpoint_happy_path(self, tmp_path):
        provider = StubMediaProvider()
        client = make_client(provider)

        res = client.post(
            "/media/enhance",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
            data={"scale": "2"},
        )

        assert res.status_code == 200, res.text
        body = res.json()
        assert body["kind"] == "enhanced"
        assert body["provider"] == "stub-media"
        assert body["url"].startswith("http://testserver/media/")
        # The stored asset is actually served at the returned URL.
        served = client.get(body["url"].removeprefix("http://testserver"))
        assert served.status_code == 200
        assert served.content == PNG_BYTES

    def test_enhance_via_image_url(self):
        provider = StubMediaProvider()
        client = make_client(provider)

        # form-only request still parses, image=None
        res = client.post(
            "/media/enhance",
            files={"_": ("", b"")},  # dummy part to force multipart encoding
            data={"image_url": "https://example.com/cake.jpg", "scale": "1"},
        )

        assert res.status_code == 200
        assert res.json()["source"] == "url"

    def test_enhance_rejects_scale_3(self):
        client = make_client(StubMediaProvider())

        res = client.post(
            "/media/enhance",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
            data={"scale": "3"},
        )

        assert res.status_code == 422  # Literal[1, 2, 4]

    def test_poster_endpoint(self):
        provider = StubMediaProvider()
        client = make_client(provider)

        res = client.post(
            "/media/poster",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
            data={"prompt": "Raya open house table", "size": "1080*1350"},
        )

        assert res.status_code == 200, res.text
        assert res.json()["kind"] == "poster"

    def test_poster_rejects_bad_size_pattern(self):
        client = make_client(StubMediaProvider())

        res = client.post(
            "/media/poster",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
            data={"prompt": "scene", "size": "1024x1024"},
        )

        assert res.status_code == 422  # Form pattern mismatch

    def test_poster_text_endpoint(self):
        provider = StubMediaProvider()
        client = make_client(provider)

        res = client.post(
            "/media/poster/text",
            data={"prompt": "keksi raya poster", "size": "928*1664"},
        )

        assert res.status_code == 200, res.text
        body = res.json()
        assert body["kind"] == "poster"
        assert body["source"] == "url"

    def test_poster_text_rejects_non_enum_size(self):
        client = make_client(StubMediaProvider())

        res = client.post(
            "/media/poster/text",
            data={"prompt": "poster", "size": "999*999"},
        )

        assert res.status_code == 422

    def test_background_endpoint_with_template(self):
        provider = StubMediaProvider()
        client = make_client(provider)

        res = client.post(
            "/media/background",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
            data={"template_id": "nature_cherryblossom"},
        )

        assert res.status_code == 200, res.text
        assert res.json()["kind"] == "background"

    def test_background_templates_passthrough(self):
        client = make_client(StubMediaProvider())

        res = client.get("/media/background/templates")

        assert res.status_code == 200
        assert res.json()["data"]["templates"][0]["id"] == "nature_cherryblossom"

    def test_media_error_maps_to_502(self):
        client = make_client(StubMediaProvider(error=MediaError("engine exploded")))

        res = client.post(
            "/media/enhance",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
        )

        assert res.status_code == 502
        assert "engine exploded" in res.json()["detail"]

    def test_not_configured_maps_to_503(self):
        client = make_client(
            StubMediaProvider(error=MediaNotConfiguredError("YOUCAM_API_KEY is not set"))
        )

        res = client.post(
            "/media/enhance",
            files={"image": ("cake.jpg", JPG_BYTES, "image/jpeg")},
        )

        assert res.status_code == 503
