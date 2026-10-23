"""LLM provider adapters.

`LLMProvider` is the interface the services depend on; concrete providers
(OpenRouter today, a cached fallback later) plug in behind it so the rest
of the app never talks to a vendor SDK directly.
"""

import json
import logging
from collections.abc import Callable
from functools import lru_cache
from typing import Protocol, TypeVar

from openai import APIError, OpenAI
from pydantic import ValidationError

from app.config import Settings, get_settings


logger = logging.getLogger(__name__)

T = TypeVar("T")


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

    def vision_json(
        self,
        system: str,
        text: str,
        image_data_url: str,
        parse: Callable[[dict], T],
    ) -> tuple[T, str]:
        """Send a prompt with one image, return (parse(json), model used).

        `parse` validates the JSON; if it raises, the next model is tried.
        """
        ...

    def text_json(
        self,
        system: str,
        user_payload: dict,
        parse: Callable[[dict], T],
    ) -> tuple[T, str]:
        """Like chat_json, but walks the text model chain until `parse` passes.

        Returns (parse(json), model used).
        """
        ...


def _load_json(content: str | None) -> dict:
    """Parse model output, allowing for ```json fences some models add."""
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Model returned non-JSON output: {content!r:.200}") from exc
    if not isinstance(data, dict):
        raise LLMError(f"Model returned non-object JSON: {content!r:.200}")
    return data


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
        self._vision_models = settings.vision_models
        self._text_models = settings.text_models
        # No SDK retries for the model chains: on a rate limit or error we
        # move on to the next model instead.
        self._vision_client = OpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            max_retries=0,
            timeout=90,
        )
        self._text_client = OpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            max_retries=0,
            timeout=150,
        )

    @property
    def model_name(self) -> str:
        return self._model

    def chat_json(self, system: str, user_payload: dict) -> dict:
        try:
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
        except APIError as exc:
            # SDK/auth/rate-limit errors all become LLMError so the router
            # can map them to a clean 502.
            raise LLMError(f"Provider request failed: {exc}") from exc
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except (TypeError, json.JSONDecodeError) as exc:
            raise LLMError(f"Model returned non-JSON output: {content!r}") from exc

    def vision_json(
        self,
        system: str,
        text: str,
        image_data_url: str,
        parse: Callable[[dict], T],
    ) -> tuple[T, str]:
        errors: list[str] = []
        for model in self._vision_models:
            try:
                response = self._vision_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": text},
                                {"type": "image_url", "image_url": {"url": image_data_url}},
                            ],
                        },
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=1500,
                )
                if not response.choices:
                    raise LLMError("empty response")
                raw = _load_json(response.choices[0].message.content)
                return parse(raw), model
            except (APIError, LLMError, ValidationError, ValueError) as exc:
                logger.warning("Vision model %s failed: %.300s", model, exc)
                errors.append(f"{model}: {str(exc)[:200]}")
        raise LLMError("All vision models failed. " + " | ".join(errors))

    def text_json(
        self,
        system: str,
        user_payload: dict,
        parse: Callable[[dict], T],
    ) -> tuple[T, str]:
        errors: list[str] = []
        content = json.dumps(user_payload, ensure_ascii=False)
        for model in self._text_models:
            try:
                response = self._text_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": content},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7,
                    max_tokens=8000,
                )
                if not response.choices:
                    raise LLMError("empty response")
                raw = _load_json(response.choices[0].message.content)
                return parse(raw), model
            except (APIError, LLMError, ValidationError, ValueError) as exc:
                logger.warning("Text model %s failed: %.300s", model, exc)
                errors.append(f"{model}: {str(exc)[:200]}")
        raise LLMError("All text models failed. " + " | ".join(errors))


@lru_cache
def get_llm_provider() -> LLMProvider:
    """FastAPI dependency; override with app.dependency_overrides in tests."""
    return OpenRouterProvider(get_settings())
