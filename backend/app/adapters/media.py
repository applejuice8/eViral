"""Media provider adapters.

`MediaProvider` is the interface the services depend on; the live
implementation is the YouCam (Perfect Corp) REST task API. It is a
proprietary async-task API (Bearer auth, poll for results), NOT
OpenAI-compatible, so it talks httpx directly instead of the OpenAI SDK.

Verified against the official OpenAPI specs (docs.perfectcorp.com):

* File API          POST /s2s/v2.0/file                  (upload slot + file_id)
* Photo Enhance     POST /s2s/v2.0/task/enhance           + GET .../enhance/{task_id}
* Image Generator   POST /s2s/v2.0/task/text-to-image/youcam
*                   POST /s2s/v2.0/task/image-to-image/youcam
* Background Change POST /s2s/v2.0/task/bg-replace        + GET .../bg-replace/{task_id}
*                   GET  /s2s/v2.0/task/template/bg-replace (predefined templates)

Lifecycle rules that shape this adapter:
- Tasks are async: POST returns a task_id; poll until task_status is
  "success" or "error" ("running" otherwise).
- Result URLs are valid ~2 hours and uploads/results are deleted within
  24 hours — download every result into our own storage immediately.
- Images: jpg/jpeg/png, <= 10 MB, long side <= 4096 (per-feature specs).
"""

import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol
from urllib.parse import quote

import httpx

from app.config import Settings, get_settings


class MediaError(Exception):
    """Media task failed or returned an unusable result."""


class MediaNotConfiguredError(Exception):
    """No API key configured for the provider."""


# Recommended quality guardrail; sent when callers omit a negative prompt.
DEFAULT_NEGATIVE_PROMPT = (
    "low resolution, low quality, blurry, distorted product, deformed shape, "
    "malformed text, watermark, oversaturated colors, artificial look"
)


@dataclass(frozen=True)
class MediaTask:
    """A submitted async task: its id plus the feature path used to poll it."""

    task_id: str
    poll_path: str  # template containing "{task_id}", e.g. "/s2s/v2.0/task/enhance/{task_id}"


class MediaProvider(Protocol):
    """Interface the media service depends on (YouCam today, cache later)."""

    @property
    def name(self) -> str:
        """Identifier of the provider (for responses and logs)."""
        ...

    def upload_image(self, data: bytes, file_name: str, content_type: str) -> str:
        """Upload image bytes; return a file_id usable as a task source."""
        ...

    def submit_enhance(
        self,
        *,
        src_file_id: str | None = None,
        src_file_url: str | None = None,
        scale: int = 1,
    ) -> MediaTask:
        """AI Photo Enhance: fix blur/pixelation, upscale (scale 1|2|4)."""
        ...

    def submit_poster_from_image(
        self,
        *,
        src_file_ids: list[str] | None = None,
        src_file_urls: list[str] | None = None,
        prompt: str,
        negative_prompt: str | None = None,
        size: str | None = None,
        prompt_extend: bool = True,
    ) -> MediaTask:
        """Image-to-image: generate a poster/scene around the real product."""
        ...

    def submit_poster_from_text(
        self,
        *,
        prompt: str,
        negative_prompt: str | None = None,
        size: str | None = None,
        prompt_extend: bool = True,
    ) -> MediaTask:
        """Text-to-image: generate a poster from a prompt only."""
        ...

    def submit_background_change(
        self,
        *,
        src_file_id: str | None = None,
        src_file_url: str | None = None,
        prompt: str | None = None,
        template_id: str | None = None,
    ) -> MediaTask:
        """Replace the background via prompt or a predefined template."""
        ...

    def list_background_templates(self) -> dict:
        """Predefined background templates (id + label)."""
        ...

    def wait_for_result_url(self, task: MediaTask) -> str:
        """Poll until success; return the (short-lived) result URL."""
        ...

    def download(self, url: str) -> bytes:
        """Fetch a result URL's bytes (presigned; no provider auth needed)."""
        ...


def _src_payload(
    src_file_id: str | None, src_file_url: str | None
) -> dict:
    """BasicRunTaskV2: exactly one of src_file_id / src_file_url."""
    if bool(src_file_id) == bool(src_file_url):
        raise MediaError("provide exactly one of src_file_id / src_file_url")
    return {"src_file_id": src_file_id} if src_file_id else {"src_file_url": src_file_url}


class YouCamProvider:
    """Perfect Corp YouCam API client.

    One httpx client holds the Bearer auth; task polling runs inline with
    the configured interval/timeout. Every caller must download results
    promptly (URLs expire) — the media service does this.
    """

    def __init__(self, settings: Settings):
        if not settings.youcam_api_key:
            raise MediaNotConfiguredError("YOUCAM_API_KEY is not set")
        self._settings = settings
        self._client = httpx.Client(
            base_url=settings.youcam_base_url,
            headers={
                "Authorization": f"Bearer {settings.youcam_api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(60.0, read=120.0),
        )

    @property
    def name(self) -> str:
        return "youcam"

    # -- low-level helpers -------------------------------------------------

    def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise MediaError(f"YouCam request failed: {exc}") from exc
        if response.status_code in (401, 403):
            raise MediaError("YouCam rejected the API key (401/403)")
        if response.status_code == 429:
            raise MediaError("YouCam rate limit hit (429) — retry later")
        if response.status_code >= 400:
            excerpt = response.text[:300]
            raise MediaError(
                f"YouCam {method} {path} returned {response.status_code}: {excerpt}"
            )
        return response

    def _submit_task(self, path: str, payload: dict) -> MediaTask:
        body = self._request("POST", path, json=payload).json()
        # All task endpoints share the {status, data: {task_id}} envelope.
        task_id = (body.get("data") or {}).get("task_id")
        if not task_id:
            raise MediaError(f"YouCam {path} returned no task_id: {body!r}")
        return MediaTask(task_id=task_id, poll_path=f"{path}/{{task_id}}")

    # -- File API ------------------------------------------------------------

    def upload_image(self, data: bytes, file_name: str, content_type: str) -> str:
        """Register the file, PUT the bytes to the presigned slot, return file_id.

        The File API wraps its payload inconsistently across doc versions
        ("files" at the top level or under "data"); accept both shapes.
        """
        payload = {
            "files": [
                {
                    "content_type": content_type,
                    "file_name": file_name,
                    "file_size": len(data),
                }
            ]
        }
        body = self._request("POST", "/s2s/v2.0/file", json=payload).json()
        files = body.get("files") or (body.get("data") or {}).get("files") or []
        if not files:
            raise MediaError(f"YouCam File API returned no upload slot: {body!r}")
        slot = files[0]
        file_id = slot.get("file_id")
        requests = slot.get("requests") or []
        if not file_id or not requests:
            raise MediaError(f"YouCam File API returned no file_id/URL: {slot!r}")

        upload = requests[0]
        try:
            response = httpx.request(
                upload.get("method", "PUT"),
                upload["url"],
                content=data,
                headers=upload.get("headers") or {},
            )
        except httpx.HTTPError as exc:
            raise MediaError(f"YouCam file upload failed: {exc}") from exc
        if response.status_code >= 400:
            raise MediaError(
                f"YouCam file upload returned {response.status_code}: {response.text[:300]}"
            )
        return file_id

    # -- task submission -------------------------------------------------

    def submit_enhance(
        self,
        *,
        src_file_id: str | None = None,
        src_file_url: str | None = None,
        scale: int = 1,
    ) -> MediaTask:
        if scale not in (1, 2, 4):
            raise MediaError("enhance scale must be 1, 2 or 4")
        payload = _src_payload(src_file_id, src_file_url) | {"scale": scale}
        return self._submit_task("/s2s/v2.0/task/enhance", payload)

    def submit_poster_from_image(
        self,
        *,
        src_file_ids: list[str] | None = None,
        src_file_urls: list[str] | None = None,
        prompt: str,
        negative_prompt: str | None = None,
        size: str | None = None,
        prompt_extend: bool = True,
    ) -> MediaTask:
        if bool(src_file_ids) == bool(src_file_urls):
            raise MediaError("provide either src_file_ids or src_file_urls (1-3 items)")
        payload: dict = {
            "model": self._settings.youcam_image_model,
            "prompt": prompt,
            "negative_prompt": negative_prompt or DEFAULT_NEGATIVE_PROMPT,
            "prompt_extend": prompt_extend,
        }
        if src_file_ids:
            payload["src_file_ids"] = src_file_ids[:3]
        else:
            payload["src_file_urls"] = src_file_urls[:3]  # type: ignore[union-attr]
        if size:
            payload["size"] = size
        return self._submit_task("/s2s/v2.0/task/image-to-image/youcam", payload)

    def submit_poster_from_text(
        self,
        *,
        prompt: str,
        negative_prompt: str | None = None,
        size: str | None = None,
        prompt_extend: bool = True,
    ) -> MediaTask:
        payload: dict = {
            "model": self._settings.youcam_image_model,
            "prompt": prompt,
            "negative_prompt": negative_prompt or DEFAULT_NEGATIVE_PROMPT,
            "prompt_extend": prompt_extend,
        }
        if size:
            payload["size"] = size
        return self._submit_task("/s2s/v2.0/task/text-to-image/youcam", payload)

    def submit_background_change(
        self,
        *,
        src_file_id: str | None = None,
        src_file_url: str | None = None,
        prompt: str | None = None,
        template_id: str | None = None,
    ) -> MediaTask:
        payload = _src_payload(src_file_id, src_file_url)
        if template_id:
            # With a template the prompt is ignored by the API.
            payload |= {"type": "template", "template_id": template_id}
        else:
            if not prompt:
                raise MediaError("background change needs a prompt or a template_id")
            payload |= {"type": "prompt", "prompt": prompt}
        return self._submit_task("/s2s/v2.0/task/bg-replace", payload)

    def list_background_templates(self) -> dict:
        return self._request("GET", "/s2s/v2.0/task/template/bg-replace").json()

    # -- polling + download -------------------------------------------------

    def wait_for_result_url(self, task: MediaTask) -> str:
        """Poll until success/error/timeout; return the ~2h result URL."""
        path = task.poll_path.format(task_id=quote(task.task_id, safe=""))
        settings = self._settings
        deadline = time.monotonic() + settings.youcam_timeout_seconds
        last_status: str | None = None
        while True:
            body = self._request("GET", path).json()
            data = body.get("data") or {}
            task_status = data.get("task_status")
            if task_status == "success":
                url = (data.get("results") or {}).get("url")
                if not url:
                    raise MediaError(f"YouCam task {task.task_id} succeeded but had no result URL: {data!r}")
                return url
            if task_status == "error":
                code = data.get("error") or "unknown_error"
                message = data.get("error_message") or ""
                raise MediaError(f"YouCam task {task.task_id} failed: {code} {message}".strip())
            if time.monotonic() > deadline:
                raise MediaError(
                    f"YouCam task {task.task_id} timed out after "
                    f"{settings.youcam_timeout_seconds}s (last status: {last_status or task_status})"
                )
            last_status = task_status
            time.sleep(settings.youcam_poll_interval_seconds)

    def download(self, url: str) -> bytes:
        """Result URLs are presigned — plain GET, no provider auth header."""
        try:
            response = httpx.get(url, timeout=120.0)
        except httpx.HTTPError as exc:
            raise MediaError(f"Result download failed: {exc}") from exc
        if response.status_code >= 400:
            raise MediaError(
                f"Result download returned {response.status_code}: {response.text[:300]}"
            )
        return response.content


@lru_cache
def get_media_provider() -> MediaProvider:
    """FastAPI dependency; override with app.dependency_overrides in tests."""
    return YouCamProvider(get_settings())
