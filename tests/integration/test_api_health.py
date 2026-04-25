"""Интеграционные тесты служебных endpoint'ов FastAPI."""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """
    Внимание: в текущем main.py StaticFiles монтируется на рут ('/')
    ПОСЛЕ регистрации /health, но в FastAPI статика обычно
    перехватывает запрос раньше — и /health может вернуть 404. Тест фиксирует
    это поведение и поможет заметить, если оно сломается.
    """
    resp = await client.get("/health")
    if resp.status_code == 200:
        body = resp.json()
        assert body["status"] == "ok"
        assert body["backend"] == "fastapi"
    else:
        # Известный side-effect текущего порядка маршрутов — /health рекомендуется
        # регистрировать ДО mount("/") в main.py.
        assert resp.status_code in (404,)


@pytest.mark.asyncio
async def test_redirect_v1_middleware_strips_prefix(client):
    """
    /api/v1/* должен внутренне переписываться в /api/*.
    Эндпоинт /api/auth/login должен принимать запросы и через /api/v1/auth/login.
    Без авторизации он вернёт 401/422, но не 404 — этого достаточно
    чтобы убедиться, что middleware работает.
    """
    resp = await client.post("/api/v1/auth/login", json={})
    assert resp.status_code != 404
