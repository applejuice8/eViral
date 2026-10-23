"""Stub providers for tests — implement the adapter protocols."""

from typing import Any

from app.adapters.llm import LLMError
from app.adapters.media import MediaTask


class StubLLMProvider:
    """Returns a canned response, or raises, depending on configuration."""

    model_name = "stub-model"

    def __init__(
        self,
        response: dict | None = None,
        error: Exception | None = None,
        vision_response: dict | None = None,
    ):
        self.response = response
        self.error = error
        self.vision_response = vision_response
        self.calls: list[dict[str, Any]] = []
        self.vision_calls: list[dict[str, Any]] = []

    def chat_json(self, system: str, user_payload: dict) -> dict:
        self.calls.append({"system": system, "user_payload": user_payload})
        if self.error is not None:
            raise self.error
        return self.response

    def vision_json(self, system: str, text: str, image_data_url: str, parse):
        self.vision_calls.append(
            {"system": system, "text": text, "image_data_url": image_data_url}
        )
        if self.error is not None:
            raise self.error
        return parse(self.vision_response), "stub-vision-model"


# Minimal magic-byte headers so the service's extension sniffing works.
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"stub-png-payload"
JPG_BYTES = b"\xff\xd8\xff\xe0" + b"stub-jpg-payload"


class StubMediaProvider:
    """Implements the MediaProvider protocol; records calls, canned results."""

    name = "stub-media"

    def __init__(
        self,
        result_bytes: bytes = PNG_BYTES,
        error: Exception | None = None,
    ):
        self.result_bytes = result_bytes
        self.error = error
        self.uploads: list[dict[str, Any]] = []
        self.submissions: list[dict[str, Any]] = []

    def _maybe_raise(self):
        if self.error is not None:
            raise self.error

    def upload_image(self, data: bytes, file_name: str, content_type: str) -> str:
        self.uploads.append(
            {"data": data, "file_name": file_name, "content_type": content_type}
        )
        self._maybe_raise()
        return "stub-file-id"

    def _submit(self, kind: str, poll_path: str, **kwargs) -> MediaTask:
        self.submissions.append({"kind": kind, **kwargs})
        self._maybe_raise()
        return MediaTask(task_id=f"task-{kind}", poll_path=poll_path)

    def submit_enhance(self, *, src_file_id=None, src_file_url=None, scale=1):
        return self._submit(
            "enhance",
            "/s2s/v2.0/task/enhance/{task_id}",
            src_file_id=src_file_id,
            src_file_url=src_file_url,
            scale=scale,
        )

    def submit_poster_from_image(
        self, *, src_file_ids=None, src_file_urls=None, prompt,
        negative_prompt=None, size=None, prompt_extend=True,
    ):
        return self._submit(
            "poster-image",
            "/s2s/v2.0/task/image-to-image/youcam/{task_id}",
            src_file_ids=src_file_ids,
            src_file_urls=src_file_urls,
            prompt=prompt,
            negative_prompt=negative_prompt,
            size=size,
            prompt_extend=prompt_extend,
        )

    def submit_poster_from_text(
        self, *, prompt, negative_prompt=None, size=None, prompt_extend=True,
    ):
        return self._submit(
            "poster-text",
            "/s2s/v2.0/task/text-to-image/youcam/{task_id}",
            prompt=prompt,
            negative_prompt=negative_prompt,
            size=size,
            prompt_extend=prompt_extend,
        )

    def submit_background_change(
        self, *, src_file_id=None, src_file_url=None, prompt=None, template_id=None,
    ):
        return self._submit(
            "background",
            "/s2s/v2.0/task/bg-replace/{task_id}",
            src_file_id=src_file_id,
            src_file_url=src_file_url,
            prompt=prompt,
            template_id=template_id,
        )

    def list_background_templates(self) -> dict:
        self._maybe_raise()
        return {
            "status": 200,
            "data": {"templates": [{"id": "nature_cherryblossom", "name": "Cherry Blossom"}]},
        }

    def wait_for_result_url(self, task: MediaTask) -> str:
        self._maybe_raise()
        return f"https://youcam-stub.example/{task.task_id}"

    def download(self, url: str) -> bytes:
        self._maybe_raise()
        return self.result_bytes


def make_understood_payload() -> dict:
    return {
        "product_type": "layered cake",
        "visible_attributes": ["brown and cream layers", "sliced on a plate"],
        "suggested_category": "Cakes",
        "uncertain": ["flavour", "size"],
    }


def make_captions_payload(platforms: list[str]) -> dict:
    return {
        "captions": [
            {
                "platform": p,
                "caption": f"Caption for {p}",
                "hashtags": ["#KekKakNora", "#Test"],
                "video_idea": f"idea for {p}" if p == "tiktok" else None,
                "rationale": "facts only",
            }
            for p in platforms
        ]
    }


__all__ = [
    "StubLLMProvider",
    "StubMediaProvider",
    "make_captions_payload",
    "make_understood_payload",
    "LLMError",
    "PNG_BYTES",
    "JPG_BYTES",
]
