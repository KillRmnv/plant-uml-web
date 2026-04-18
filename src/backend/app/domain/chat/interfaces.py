"""Абстрактные интерфейсы репозиториев домена chat."""

from abc import ABC, abstractmethod

from backend.app.domain.chat.entities import Chat, Message


class IChatRepository(ABC):
    @abstractmethod
    async def get_by_id_for_user(self, user_id: int, chat_id: int) -> Chat | None: ...

    @abstractmethod
    async def exists(self, chat_id: int) -> bool: ...

    @abstractmethod
    async def get_or_create(
        self, user_id: int, chat_id: int | None = None
    ) -> Chat: ...

    @abstractmethod
    async def get_history(
        self, chat_id: int, limit: int = 10
    ) -> list[dict]: ...

    @abstractmethod
    async def list_for_user(self, user_id: int) -> list[Chat]: ...

    @abstractmethod
    async def get_for_user(self, user_id: int, chat_id: int) -> Chat: ...

    @abstractmethod
    async def create(self, user_id: int, title: str | None = None) -> Chat: ...

    @abstractmethod
    async def delete(self, user_id: int, chat_id: int) -> None: ...

    @abstractmethod
    async def update_title(
        self, user_id: int, chat_id: int, title: str
    ) -> Chat: ...

    @abstractmethod
    async def update_title_by_id(self, chat_id: int, title: str) -> Chat: ...

    @abstractmethod
    async def get_messages(
        self, user_id: int, chat_id: int
    ) -> list[Message]: ...

    @abstractmethod
    async def get_preview(self, chat_id: int) -> str: ...

    @abstractmethod
    async def add_message(
        self, chat_id: int, role: str, content: str
    ) -> Message: ...
