"""LLM provider adapters.

`LLMProvider` is the interface the services depend on; concrete providers
(OpenRouter today, a cached fallback later) plug in behind it so the rest
of the app never talks to a vendor SDK directly.
"""

import json
from functools import lru_cache
from typing import Protocol

from openai import OpenAI

from app.config import Settings, get_settings


class LLMError(Exception):
    """LLM call failed or returned unusable output."""


class LLMNotConfiguredError(Exception):
    """No API key configured for the provider."""


class LLMProvider(Protocol):
    @property
    def model_name(self) -> str:
        """Identifier of the underlying model (for responses and logs)."""
        ...

    def chat_json(self, system: str, user_payload: dict) -> dict:
        """Send a system prompt + JSON user payload, return parsed JSON."""
        ...


class OpenRouterProvider:
    """OpenRouter via the OpenAI SDK (OpenAI-compatible endpoint).

    Uses JSON-object mode and validates/repairs with the caller's Pydantic
    models — free models do not reliably support strict json_schema.
    """

    def __init__(self, settings: Settings):
        if not settings.openrouter_api_key:
            raise LLMNotConfiguredError(
                "OPENROUTER_API_KEY is not set"
            )
        self._client = OpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
        )
        self._model = settings.llm_model_text

    @property
    def model_name(self) -> str:
        return self._model

    def chat_json(self, system: str, user_payload: dict) -> dict:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except (TypeError, json.JSONDecodeError) as exc:
            raise LLMError(f"Model returned non-JSON output: {content!r}") from exc


@lru_cache
def get_llm_provider() -> LLMProvider:
    """FastAPI dependency; override with app.dependency_overrides in tests."""
    return OpenRouterProvider(get_settings())
