"""Интеграционные тесты сервисного слоя users."""
import pytest

from backend.app.domains.users import services, schemas
from backend.app.domains.users.exceptions import InvalidCredentialsError


@pytest.mark.asyncio
async def test_register_new_user_hashes_password(db_session):
    payload = schemas.UserCreate(username="alice", password="secret123")
    user = await services.register_new_user(db_session, payload)
    assert user.id is not None
    assert user.password != "secret123"  # хэш, а не plaintext


@pytest.mark.asyncio
async def test_authenticate_user_success(db_session):
    payload = schemas.UserCreate(username="bob", password="strongpass")
    await services.register_new_user(db_session, payload)

    authed = await services.authenticate_user(db_session, "bob", "strongpass")
    assert authed.login == "bob"


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(db_session):
    payload = schemas.UserCreate(username="bob", password="strongpass")
    await services.register_new_user(db_session, payload)

    with pytest.raises(InvalidCredentialsError):
        await services.authenticate_user(db_session, "bob", "wrongpass")


@pytest.mark.asyncio
async def test_authenticate_unknown_user(db_session):
    with pytest.raises(InvalidCredentialsError):
        await services.authenticate_user(db_session, "ghost", "any")
