"""Интеграционные тесты /assistant/providers и /assistant/models."""
import pytest

from backend.app.integrations.llm import client as llm_client


@pytest.mark.asyncio
async def test_get_providers(client):
    resp = await client.get("/api/v1/assistant/providers")
    assert resp.status_code == 200
    providers = resp.json()
    assert isinstance(providers, list)
    ids = {p["id"] for p in providers}
    assert {"openai", "anthropic", "mistral", "openrouter"} <= ids


@pytest.mark.asyncio
async def test_get_models_uses_llm_client(client, monkeypatch):
    async def _fake(provider):
        return [f"{provider}-model-1", f"{provider}-model-2"]

    # Роут импортирует list_provider_models по имени — подменяем ссылку внутри модуля роута
    from backend.app.api.v1.routes import assistant_info as ai_route
    monkeypatch.setattr(ai_route, "list_provider_models", _fake)

    resp = await client.get("/api/v1/assistant/models?provider=openai")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"models": ["openai-model-1", "openai-model-2"]}


@pytest.mark.asyncio
async def test_get_models_requires_provider_param(client):
    resp = await client.get("/api/v1/assistant/models")
    assert resp.status_code == 422  # FastAPI: missing required query param
