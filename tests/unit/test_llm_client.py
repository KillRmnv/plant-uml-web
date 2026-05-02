"""Юнит-тесты для интеграции с LLM-провайдерами (без сети)."""
import json
from unittest.mock import MagicMock

import pytest

from backend.app.integrations.llm import client as llm_client


class TestProviderConfig:
    def test_known_providers_present(self):
        for p in ("openai", "anthropic", "mistral", "openrouter", "localai"):
            assert llm_client.get_provider_config(p) is not None

    def test_unknown_provider_returns_none(self):
        assert llm_client.get_provider_config("foo") is None

    def test_list_available_providers_shape(self):
        providers = llm_client.list_available_providers()
        assert isinstance(providers, list)
        for p in providers:
            assert "id" in p and "name" in p


class TestSseFormatting:
    def test_format_sse_string(self):
        assert llm_client._format_sse("[DONE]") == "data: [DONE]\n\n"

    def test_format_sse_dict(self):
        out = llm_client._format_sse({"content": "hi"})
        assert out.startswith("data: ")
        # парсим обратно
        body = out[len("data: ") :].strip()
        assert json.loads(body) == {"content": "hi"}

    def test_format_sse_unicode(self):
        out = llm_client._format_sse({"content": "Привет"})
        assert "Привет" in out  # не экранировано


class TestPrepareAnthropicPayload:
    def test_extracts_system_messages(self):
        msgs = [
            {"role": "system", "content": "system-1"},
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
            {"role": "system", "content": "system-2"},
        ]
        payload = llm_client._prepare_anthropic_payload("claude-3", msgs)

        assert payload["model"] == "claude-3"
        assert payload["stream"] is True
        assert "max_tokens" in payload
        assert payload["system"] == "system-1\n\nsystem-2"
        # system удалены из messages, неизвестные роли — тоже
        assert all(m["role"] in {"user", "assistant"} for m in payload["messages"])
        assert len(payload["messages"]) == 2

    def test_no_system_messages_no_system_key(self):
        msgs = [{"role": "user", "content": "hi"}]
        payload = llm_client._prepare_anthropic_payload("claude-3", msgs)
        assert "system" not in payload


class TestRateLimitMessage:
    def test_basic_message_contains_provider(self):
        exc = MagicMock()
        exc.response = None
        msg = llm_client._build_rate_limit_message("openai", "gpt-4o", exc)
        assert "OpenAI" in msg
        assert "rate limit" in msg.lower()

    def test_openrouter_free_model_hint(self):
        exc = MagicMock()
        exc.response = None
        msg = llm_client._build_rate_limit_message(
            "openrouter", "meta/llama:free", exc
        )
        assert "meta/llama:free" in msg
        assert "Бесплатная" in msg

    def test_retry_after_header_used(self):
        exc = MagicMock()
        exc.response.headers = {"retry-after": "30"}
        msg = llm_client._build_rate_limit_message("mistral", "m-large", exc)
        assert "Retry-After: 30" in msg


class TestListProviderModels:
    @pytest.mark.asyncio
    async def test_unknown_provider_returns_empty(self):
        assert await llm_client.list_provider_models("does-not-exist") == []

    @pytest.mark.asyncio
    async def test_failure_falls_back_to_default(self, monkeypatch):
        """Если HTTP-запрос упал — должна вернуться default-модель провайдера."""

        class _BoomClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_a):
                return False

            async def get(self, *_a, **_kw):
                raise RuntimeError("network down")

        monkeypatch.setattr(llm_client.httpx, "AsyncClient", lambda **_: _BoomClient())
        models = await llm_client.list_provider_models("openai")
        assert models == ["gpt-4o"]
