"""Юнит-тесты для backend/app/core/security.py."""
import jwt
import pytest

from backend.app.config import settings
from backend.app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        password = "MyStrongPass123!"
        hashed = get_password_hash(password)
        assert hashed != password
        assert hashed.startswith("$2")  # bcrypt prefix

    def test_verify_correct_password(self):
        password = "qwerty12345"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_incorrect_password(self):
        hashed = get_password_hash("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt использует salt, поэтому хэши отличаются."""
        p = "samepass"
        assert get_password_hash(p) != get_password_hash(p)

    @pytest.mark.parametrize(
        "password",
        ["", "x", "🔒пароль", "a" * 200, "spaces are ok"],
    )
    def test_various_passwords_roundtrip(self, password):
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)


class TestAccessToken:
    def test_token_contains_subject_and_exp(self):
        token = create_access_token({"sub": "alice"})
        decoded = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        assert decoded["sub"] == "alice"
        assert "exp" in decoded

    def test_token_is_string(self):
        assert isinstance(create_access_token({"sub": "bob"}), str)

    def test_invalid_signature_raises(self):
        token = create_access_token({"sub": "x"})
        with pytest.raises(jwt.PyJWTError):
            jwt.decode(token, "another-secret", algorithms=[settings.jwt_algorithm])
