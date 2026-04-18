"""Чистые доменные сущности пользователей.

Не зависят от SQLAlchemy, FastAPI и инфраструктуры. Могут использоваться
во всех слоях приложения (application, presentation).
"""

from dataclasses import dataclass, field


@dataclass
class User:
    id: int
    login: str
    password: str

    def __repr__(self) -> str:
        return f"User(login='{self.login}', id='{self.id}')"


@dataclass
class UserSettings:
    id: int
    user_id: int
    provider: str | None = None
    model: str | None = None
    auto_save: bool = True
    api_keys: dict = field(default_factory=dict)
