"""Юнит-тесты вспомогательных функций chat.services (без БД)."""
import pytest

from backend.app.domains.chat import services


class TestBuildChatTitle:
    @pytest.mark.parametrize(
        "msg,expected",
        [
            ("Hello world.", "Hello world"),
            ("Какой это график? Покажи", "Какой это график"),
            ("Скажи!", "Скажи"),
            ("   ", "Новый анализ"),
            ("", "Новый анализ"),
        ],
    )
    def test_basic(self, msg, expected):
        assert services._build_chat_title(msg) == expected

    def test_truncates_long_titles(self):
        long_msg = "x" * 100
        title = services._build_chat_title(long_msg)
        # 47 символов + "..." = 50
        assert len(title) == 50
        assert title.endswith("...")


class TestNormalizeChatId:
    @pytest.mark.parametrize("v", [None, 0, -5])
    def test_none_or_non_positive_returns_none(self, v):
        assert services._normalize_chat_id(v) is None

    def test_too_big_returns_none(self):
        assert services._normalize_chat_id(services.PG_INT32_MAX + 1) is None

    @pytest.mark.parametrize("v", [1, 100, services.PG_INT32_MAX])
    def test_valid_passes_through(self, v):
        assert services._normalize_chat_id(v) == v
