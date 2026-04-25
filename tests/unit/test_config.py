"""Юнит-тесты для backend.app.config.Settings (computed_field-ы)."""
from pathlib import Path


def test_settings_loads_with_required_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@h:5432/d")
    monkeypatch.setenv("SECRET_KEY", "k")
    from backend.app.config import Settings

    s = Settings()
    assert str(s.database_url).startswith("postgresql+asyncpg://")
    assert s.secret_key == "k"
    assert s.host == "0.0.0.0"
    assert s.port == 8000


def test_public_url_is_built_correctly(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@h:5432/d")
    monkeypatch.setenv("SECRET_KEY", "k")
    monkeypatch.setenv("SC_SERVER_HOST", "example.com")
    monkeypatch.setenv("SC_SERVER_PORT", "9999")
    from backend.app.config import Settings

    s = Settings()
    assert s.public_url == "ws://example.com:9999/ws_json"


def test_computed_paths_are_paths(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@h:5432/d")
    monkeypatch.setenv("SECRET_KEY", "k")
    from backend.app.config import Settings

    s = Settings()
    assert isinstance(s.static_path, Path)
    assert isinstance(s.frontend_path, Path)
    assert isinstance(s.repo_file_path, Path)
    assert s.frontend_path.name == "frontend"
