"""Интеграционные тесты роутов /api/v1/auth/* и /api/v1/users/me."""
import pytest


@pytest.mark.asyncio
async def test_register_creates_user(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["username"] == "alice"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_invalid_payload(client):
    resp = await client.post(
        "/api/v1/auth/register", json={"username": "ab", "password": "x"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_returns_jwt(client):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "bob", "password": "strongpass"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "bob", "password": "strongpass"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20
    assert data["user"]["username"] == "bob"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "carol", "password": "rightpass"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "carol", "password": "wrongpass"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "ghost", "password": "irrelevant"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client, auth_headers):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "apiuser"


@pytest.mark.asyncio
async def test_users_me_requires_auth(client):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_rejected(client):
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer total.garbage.token"},
    )
    assert resp.status_code == 401
