"""Stub LLM provider for tests — implements the LLMProvider protocol."""

from typing import Any

from app.adapters.llm import LLMError


class StubLLMProvider:
    """Returns a canned response, or raises, depending on configuration."""

    model_name = "stub-model"

    def __init__(self, response: dict | None = None, error: Exception | None = None):
        self.response = response
        self.error = error
        self.calls: list[dict[str, Any]] = []

    def chat_json(self, system: str, user_payload: dict) -> dict:
        self.calls.append({"system": system, "user_payload": user_payload})
        if self.error is not None:
            raise self.error
        return self.response


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


__all__ = ["StubLLMProvider", "make_captions_payload", "LLMError"]
