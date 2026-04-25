"""Юнит-тесты Pydantic-схем домена users."""
import pytest
from pydantic import ValidationError

from backend.app.domains.users import schemas


class TestUserCreate:
    def test_valid_payload(self):
        u = schemas.UserCreate(username="alice", password="secret123")
        assert u.login == "alice"
        assert u.password == "secret123"

    def test_login_alias_via_field_name(self):
        """Должен принимать и login (имя поля), и username (alias)."""
        u = schemas.UserCreate(login="bob", password="strongpass")
        assert u.login == "bob"

    @pytest.mark.parametrize("login", ["", "ab"])  # < 3
    def test_short_login_rejected(self, login):
        with pytest.raises(ValidationError):
            schemas.UserCreate(username=login, password="secret123")

    def test_long_login_rejected(self):
        with pytest.raises(ValidationError):
            schemas.UserCreate(username="a" * 21, password="secret123")

    @pytest.mark.parametrize("password", ["", "short"])  # < 6
    def test_short_password_rejected(self, password):
        with pytest.raises(ValidationError):
            schemas.UserCreate(username="alice", password=password)


class TestUserResponse:
    def test_serializes_login_as_username(self):
        class Stub:
            id = 42
            login = "carol"

        resp = schemas.UserResponse.model_validate(Stub())
        dumped = resp.model_dump()
        assert dumped == {"id": 42, "username": "carol"}


class TestLoginRequest:
    def test_valid(self):
        req = schemas.LoginRequest(username="x", password="y")
        assert req.username == "x"

    def test_missing_password(self):
        with pytest.raises(ValidationError):
            schemas.LoginRequest(username="x")
