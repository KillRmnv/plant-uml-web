"""SQLAlchemy-реализация репозитория чатов.

Публичные функции возвращают доменные сущности
(``domain/chat/entities.py``); ORM-объекты не утекают за пределы модуля.
"""

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.infrastructure.persistence.chat_models import (
    Chat as ChatORM,
    Message as MessageORM,
)
from backend.app.domain.chat.entities import Chat, Message
from backend.app.domain.chat.exceptions import ChatAccessDeniedError
from backend.app.domain.chat.interfaces import IChatRepository


def _chat_to_domain(orm: ChatORM | None) -> Chat | None:
    if orm is None:
        return None
    return Chat(
        id=orm.id,
        user_id=orm.user_id,
        title=orm.title,
        created_at=orm.created_at,
    )


def _message_to_domain(orm: MessageORM) -> Message:
    return Message(
        id=orm.id,
        chat_id=orm.chat_id,
        role=orm.role,
        content=orm.content,
        created_at=orm.created_at,
    )


async def _get_orm_by_id_for_user(
    db: AsyncSession, user_id: int, chat_id: int
) -> ChatORM | None:
    stmt = select(ChatORM).where(ChatORM.id == chat_id, ChatORM.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_chat_by_id_for_user(
    db: AsyncSession, user_id: int, chat_id: int
) -> Chat | None:
    return _chat_to_domain(await _get_orm_by_id_for_user(db, user_id, chat_id))


async def chat_exists(db: AsyncSession, chat_id: int) -> bool:
    stmt = select(ChatORM).where(ChatORM.id == chat_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_or_create_chat(
    db: AsyncSession, user_id: int, chat_id: int | None = None
) -> Chat:
    if chat_id:
        existing = await _get_orm_by_id_for_user(db, user_id, chat_id)
        if existing:
            return _chat_to_domain(existing)  # type: ignore[return-value]
        if await chat_exists(db, chat_id):
            raise ChatAccessDeniedError(chat_id)

    new_chat = ChatORM(user_id=user_id)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)
    return _chat_to_domain(new_chat)  # type: ignore[return-value]


async def get_chat_history(
    db: AsyncSession, chat_id: int, limit: int = 10
) -> list[dict]:
    """Возвращает последние сообщения в формате LLM `[{"role", "content"}]`."""
    stmt = (
        select(MessageORM)
        .where(MessageORM.chat_id == chat_id)
        .order_by(desc(MessageORM.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [{"role": msg.role, "content": msg.content} for msg in reversed(messages)]


async def list_user_chats(db: AsyncSession, user_id: int) -> list[Chat]:
    stmt = (
        select(ChatORM)
        .where(ChatORM.user_id == user_id)
        .order_by(desc(ChatORM.created_at))
    )
    result = await db.execute(stmt)
    return [_chat_to_domain(orm) for orm in result.scalars().all()]  # type: ignore[misc]


async def get_chat_for_user(db: AsyncSession, user_id: int, chat_id: int) -> Chat:
    chat = await get_chat_by_id_for_user(db, user_id, chat_id)
    if chat:
        return chat
    raise ChatAccessDeniedError(chat_id)


async def create_chat(
    db: AsyncSession, user_id: int, title: str | None = None
) -> Chat:
    chat = ChatORM(user_id=user_id, title=title or "Новый анализ")
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return _chat_to_domain(chat)  # type: ignore[return-value]


async def delete_chat(db: AsyncSession, user_id: int, chat_id: int) -> None:
    orm = await _get_orm_by_id_for_user(db, user_id, chat_id)
    if orm is None:
        raise ChatAccessDeniedError(chat_id)
    await db.delete(orm)
    await db.commit()


async def update_chat_title(
    db: AsyncSession, user_id: int, chat_id: int, title: str
) -> Chat:
    orm = await _get_orm_by_id_for_user(db, user_id, chat_id)
    if orm is None:
        raise ChatAccessDeniedError(chat_id)
    orm.title = title
    await db.commit()
    await db.refresh(orm)
    return _chat_to_domain(orm)  # type: ignore[return-value]


async def update_chat_title_by_id(
    db: AsyncSession, chat_id: int, title: str
) -> Chat:
    """Обновить заголовок без проверки владельца (используется оркестратором)."""
    stmt = select(ChatORM).where(ChatORM.id == chat_id)
    result = await db.execute(stmt)
    orm = result.scalar_one_or_none()
    if orm is None:
        raise ChatAccessDeniedError(chat_id)
    orm.title = title
    await db.commit()
    await db.refresh(orm)
    return _chat_to_domain(orm)  # type: ignore[return-value]


async def get_chat_messages(
    db: AsyncSession, user_id: int, chat_id: int
) -> list[Message]:
    await get_chat_for_user(db, user_id, chat_id)
    stmt = (
        select(MessageORM)
        .where(MessageORM.chat_id == chat_id)
        .order_by(MessageORM.created_at)
    )
    result = await db.execute(stmt)
    return [_message_to_domain(m) for m in result.scalars().all()]


async def get_chat_preview(db: AsyncSession, chat_id: int) -> str:
    stmt = (
        select(MessageORM.content)
        .where(MessageORM.chat_id == chat_id)
        .order_by(desc(MessageORM.created_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    preview = result.scalar_one_or_none()
    return preview[:50] if preview else ""


async def add_message(
    db: AsyncSession, chat_id: int, role: str, content: str
) -> Message:
    """Добавляет сообщение в чат и коммитит транзакцию."""
    msg = MessageORM(chat_id=chat_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return _message_to_domain(msg)


class SqlAlchemyChatRepository(IChatRepository):
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_by_id_for_user(
        self, user_id: int, chat_id: int
    ) -> Chat | None:
        return await get_chat_by_id_for_user(self._db, user_id, chat_id)

    async def exists(self, chat_id: int) -> bool:
        return await chat_exists(self._db, chat_id)

    async def get_or_create(
        self, user_id: int, chat_id: int | None = None
    ) -> Chat:
        return await get_or_create_chat(self._db, user_id, chat_id)

    async def get_history(self, chat_id: int, limit: int = 10) -> list[dict]:
        return await get_chat_history(self._db, chat_id, limit)

    async def list_for_user(self, user_id: int) -> list[Chat]:
        return await list_user_chats(self._db, user_id)

    async def get_for_user(self, user_id: int, chat_id: int) -> Chat:
        return await get_chat_for_user(self._db, user_id, chat_id)

    async def create(self, user_id: int, title: str | None = None) -> Chat:
        return await create_chat(self._db, user_id, title)

    async def delete(self, user_id: int, chat_id: int) -> None:
        await delete_chat(self._db, user_id, chat_id)

    async def update_title(
        self, user_id: int, chat_id: int, title: str
    ) -> Chat:
        return await update_chat_title(self._db, user_id, chat_id, title)

    async def update_title_by_id(self, chat_id: int, title: str) -> Chat:
        return await update_chat_title_by_id(self._db, chat_id, title)

    async def get_messages(
        self, user_id: int, chat_id: int
    ) -> list[Message]:
        return await get_chat_messages(self._db, user_id, chat_id)

    async def get_preview(self, chat_id: int) -> str:
        return await get_chat_preview(self._db, chat_id)

    async def add_message(
        self, chat_id: int, role: str, content: str
    ) -> Message:
        return await add_message(self._db, chat_id, role, content)
