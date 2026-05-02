"""Юнит-тесты Pydantic-схем домена chat."""
import pytest
from pydantic import ValidationError

from backend.app.domains.chat import schemas


def _valid_consult_payload(**overrides):
    base = dict(
        provider="openai",
        api_key="sk-test",
        message="hello",
        diagram_code="@startuml\n@enduml",
    )
    base.update(overrides)
    return base


class TestChatConsultRequest:
    def test_valid(self):
        req = schemas.ChatConsultRequest(**_valid_consult_payload())
        assert req.provider == "openai"
        assert req.mode == "assistant"  # дефолт

    @pytest.mark.parametrize("mode", ["assistant", "analyst"])
    def test_modes_allowed(self, mode):
        req = schemas.ChatConsultRequest(**_valid_consult_payload(mode=mode))
        assert req.mode == mode

    def test_invalid_mode_rejected(self):
        with pytest.raises(ValidationError):
            schemas.ChatConsultRequest(**_valid_consult_payload(mode="hacker"))

    def test_invalid_provider_rejected(self):
        with pytest.raises(ValidationError):
            schemas.ChatConsultRequest(**_valid_consult_payload(provider="foo"))

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError):
            schemas.ChatConsultRequest(**_valid_consult_payload(message=""))

    def test_too_long_message_rejected(self):
        with pytest.raises(ValidationError):
            schemas.ChatConsultRequest(**_valid_consult_payload(message="x" * 2001))


class TestChatUpdateRequest:
    def test_valid(self):
        assert schemas.ChatUpdateRequest(title="My chat").title == "My chat"

    def test_empty_title_rejected(self):
        with pytest.raises(ValidationError):
            schemas.ChatUpdateRequest(title="")
