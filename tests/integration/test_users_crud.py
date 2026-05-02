"""Интеграционные тесты CRUD-слоя домена users (in-memory SQLite)."""
import pytest
from sqlalchemy.exc import IntegrityError

from backend.app.domains.users import crud
from backend.app.domains.users.exceptions import UserAlreadyExistsError


@pytest.mark.asyncio
async def test_create_and_get_user(db_session):
    user = await crud.create_user(db_session, "alice", "hashed-password")
    assert user.id is not None
    assert user.login == "alice"

    fetched = await crud.get_user_by_login(db_session, "alice")
    assert fetched is not None
    assert fetched.id == user.id


@pytest.mark.asyncio
async def test_get_user_by_login_returns_none_for_unknown(db_session):
    assert await crud.get_user_by_login(db_session, "nobody") is None


@pytest.mark.asyncio
async def test_get_user_by_id(db_session):
    user = await crud.create_user(db_session, "carol", "h")
    found = await crud.get_user_by_id(db_session, user.id)
    assert found is not None and found.login == "carol"

    assert await crud.get_user_by_id(db_session, 999_999) is None
