"""Юнит-тесты доменных исключений."""
from backend.app.domains.users.exceptions import (
    UserAlreadyExistsError,
    UserNotFoundError,
    InvalidCredentialsError,
    APIKeyNotConfiguredError,
    ProviderNotSupportedError,
    ProviderAPIError,
    ProviderConnectionError,
)
from backend.app.domains.chat.exceptions import (
    ChatAccessDeniedError,
    ChatNotFoundError,
)
from backend.app.domains.diagram.exceptions import AgentExecutionError


class TestUserExceptions:
    def test_user_already_exists_message(self):
        e = UserAlreadyExistsError("alice")
        assert "alice" in e.message
        assert e.login == "alice"

    def test_user_not_found_int_id(self):
        e = UserNotFoundError(42)
        assert "42" in e.message

    def test_invalid_credentials_has_message(self):
        assert InvalidCredentialsError().message

    def test_api_key_not_configured_attrs(self):
        e = APIKeyNotConfiguredError("openai")
        assert e.provider == "openai"

    def test_provider_api_error_attrs(self):
        e = ProviderAPIError("openai", 503)
        assert e.provider == "openai"
        assert e.status_code == 503


class TestChatExceptions:
    def test_chat_access_denied_attrs(self):
        e = ChatAccessDeniedError(7)
        assert e.chat_id == 7
        assert "7" in e.message

    def test_chat_not_found(self):
        e = ChatNotFoundError(99)
        assert e.chat_id == 99


class TestDiagramExceptions:
    def test_agent_execution_default_reason(self):
        e = AgentExecutionError()
        assert e.reason

    def test_agent_execution_custom_reason(self):
        e = AgentExecutionError("LLM timed out")
        assert e.reason == "LLM timed out"
        assert "LLM timed out" in str(e)
