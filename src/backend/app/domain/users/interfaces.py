"""Абстрактные интерфейсы репозиториев домена users.

Инфраструктурный слой (``infrastructure/persistence/...``) обязан реализовать
эти интерфейсы; application-слой работает только с доменными сущностями,
не зная о конкретной технологии хранения.
"""

from abc import ABC, abstractmethod

from backend.app.domain.users.entities import User, UserSettings


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_login(self, login: str) -> User | None: ...

    @abstractmethod
    async def get_by_id(self, user_id: int) -> User | None: ...

    @abstractmethod
    async def create(self, login: str, hashed_password: str) -> User: ...


class IUserSettingsRepository(ABC):
    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> UserSettings | None: ...

    @abstractmethod
    async def create_or_update(
        self,
        user_id: int,
        provider: str | None = None,
        model: str | None = None,
        auto_save: bool | None = None,
        api_keys: dict | None = None,
    ) -> UserSettings: ...
