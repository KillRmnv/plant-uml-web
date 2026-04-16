from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.chat.models import Chat, Message


async def get_or_create_chat(db: AsyncSession, user_id: int, chat_id: int | None = None) -> Chat:
    """Возвращает существующий чат или создает новый."""
    if chat_id:
        stmt = select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id)
        result = await db.execute(stmt)
        chat = result.scalar_one_or_none()
        if chat:
            return chat

    # Если chat_id не передан или чужой - создаем новый
    new_chat = Chat(user_id=user_id)
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)
    return new_chat


async def get_chat_history(db: AsyncSession, chat_id: int, limit: int = 10) -> list[dict]:
    """
    Достает последние сообщения и форматирует их в формат LLM `[{"role": ..., "content": ...}]`.
    """
    # Сортируем по убыванию даты, чтобы взять последние, затем переворачиваем обратно
    stmt = select(Message).where(Message.chat_id == chat_id).order_by(desc(Message.created_at)).limit(limit)
    result = await db.execute(stmt)
    messages = result.scalars().all()

    # Переворачиваем в хронологический порядок (старые -> новые)
    return [{"role": msg.role, "content": msg.content} for msg in reversed(messages)]