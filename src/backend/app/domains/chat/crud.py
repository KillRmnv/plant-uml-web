from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.domains.chat.models import Chat, Message
from backend.app.domains.chat.exceptions import ChatAccessDeniedError


async def get_or_create_chat(
    db: AsyncSession, user_id: int, chat_id: int | None = None
) -> Chat:
    if chat_id:
        stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
        result = await db.execute(stmt)
        chat = result.scalar_one_or_none()
        if chat:
            return chat
        # Чат существует, но не принадлежит пользователю
        # Проверяем: чат вообще существует?
        exists_stmt = select(Chat).where(Chat.id == chat_id)
        exists = await db.execute(exists_stmt)
        if exists.scalar_one_or_none():
            raise ChatAccessDeniedError(chat_id)  # чужой чат
        # Если чата нет вообще — создаём новый (молчаливо)

    new_chat = Chat(user_id=user_id)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)
    return new_chat


async def get_chat_history(
    db: AsyncSession, chat_id: int, limit: int = 10
) -> list[dict]:
    """
    Достает последние сообщения и форматирует их в формат LLM `[{"role": ..., "content": ...}]`.
    """
    # Сортируем по убыванию даты, чтобы взять последние, затем переворачиваем обратно
    stmt = (
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(desc(Message.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    # Переворачиваем в хронологический порядок (старые -> новые)
    return [{"role": msg.role, "content": msg.content} for msg in reversed(messages)]


async def list_user_chats(db: AsyncSession, user_id: int) -> list[Chat]:
    stmt = select(Chat).where(Chat.user_id == user_id).order_by(desc(Chat.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_chat_for_user(db: AsyncSession, user_id: int, chat_id: int) -> Chat:
    stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
    result = await db.execute(stmt)
    chat = result.scalar_one_or_none()
    if chat:
        return chat
    raise ChatAccessDeniedError(chat_id)


async def create_chat(db: AsyncSession, user_id: int, title: str | None = None) -> Chat:
    chat = Chat(user_id=user_id, title=title or "Новый анализ")
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


async def delete_chat(db: AsyncSession, user_id: int, chat_id: int) -> None:
    chat = await get_chat_for_user(db, user_id, chat_id)
    await db.delete(chat)
    await db.commit()


async def update_chat_title(
    db: AsyncSession, user_id: int, chat_id: int, title: str
) -> Chat:
    chat = await get_chat_for_user(db, user_id, chat_id)
    chat.title = title
    await db.commit()
    await db.refresh(chat)
    return chat


async def get_chat_messages(
    db: AsyncSession, user_id: int, chat_id: int
) -> list[Message]:
    await get_chat_for_user(db, user_id, chat_id)
    stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_chat_preview(db: AsyncSession, chat_id: int) -> str:
    stmt = (
        select(Message.content)
        .where(Message.chat_id == chat_id)
        .order_by(desc(Message.created_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    preview = result.scalar_one_or_none()
    return preview[:50] if preview else ""
