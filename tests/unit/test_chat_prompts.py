"""Юнит-тесты для backend.app.domains.chat.prompts."""
from backend.app.domains.chat.prompts import (
    ASSISTANT_SYSTEM_PROMPT,
    ANALYST_SYSTEM_PROMPT,
    DEFAULT_CHAT_MODE,
    build_system_prompt,
)


def test_default_mode_is_assistant():
    assert DEFAULT_CHAT_MODE == "assistant"


def test_assistant_prompt_returned():
    prompt = build_system_prompt(mode="assistant", diagram_code="ignored")
    assert prompt == ASSISTANT_SYSTEM_PROMPT  # шаблон без подстановки


def test_analyst_prompt_includes_diagram():
    code = "@startuml\nA --> B\n@enduml"
    prompt = build_system_prompt(mode="analyst", diagram_code=code)
    assert prompt is not None
    assert code in prompt
    assert "системный аналитик" in prompt


def test_unknown_mode_falls_back_to_assistant():
    prompt = build_system_prompt(mode="unknown", diagram_code="x")  # type: ignore[arg-type]
    assert prompt == ASSISTANT_SYSTEM_PROMPT
