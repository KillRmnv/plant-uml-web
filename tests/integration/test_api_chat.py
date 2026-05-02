"""Интеграционные тесты роутов /api/v1/chat/*."""
import pytest


@pytest.mark.asyncio
async def test_chats_requires_auth(client):
    resp = await client.get("/api/v1/chat/chats")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_chats(client, auth_headers):
    resp = await client.post(
        "/api/v1/chat/chats", json={"title": "Hello"}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    chat = resp.json()
    assert chat["title"] == "Hello"

    resp_list = await client.get("/api/v1/chat/chats", headers=auth_headers)
    assert resp_list.status_code == 200
    chats = resp_list.json()
    assert len(chats) == 1
    assert chats[0]["title"] == "Hello"


@pytest.mark.asyncio
async def test_update_chat_title(client, auth_headers):
    created = await client.post(
        "/api/v1/chat/chats", json={"title": "old"}, headers=auth_headers
    )
    chat_id = created.json()["id"]

    resp = await client.put(
        f"/api/v1/chat/chats/{chat_id}",
        json={"title": "new"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "new"


@pytest.mark.asyncio
async def test_update_unknown_chat_returns_403_or_404(client, auth_headers):
    """Сторонний chat_id должен возвращать 403/404 (зависит от сервиса)."""
    resp = await client.put(
        "/api/v1/chat/chats/999999",
        json={"title": "x"},
        headers=auth_headers,
    )
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_delete_chat(client, auth_headers):
    created = await client.post(
        "/api/v1/chat/chats", json={"title": "tbd"}, headers=auth_headers
    )
    chat_id = created.json()["id"]

    resp = await client.delete(
        f"/api/v1/chat/chats/{chat_id}", headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json() == {"success": True}

    resp_list = await client.get("/api/v1/chat/chats", headers=auth_headers)
    assert resp_list.json() == []


@pytest.mark.asyncio
async def test_messages_for_unknown_chat(client, auth_headers):
    resp = await client.get(
        "/api/v1/chat/chats/999999/messages", headers=auth_headers
    )
    assert resp.status_code in (403, 404)
