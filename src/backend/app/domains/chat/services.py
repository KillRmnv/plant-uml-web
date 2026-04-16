import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.chat import crud
from app.domains.chat.models import Message
from app.domains.users.models import User
from app.integrations.llm.client import generate_and_save_response
from app.domains.chat.exceptions import APIKeyNotConfiguredError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Вы — эксперт-аналитик систем OSTIS.
Отвечайте четко, опираясь на текущую диаграмму:
```plantuml
{diagram_code}
```
"""


async def process_chat_consultation(
        db: AsyncSession,
        user: User,
        provider: str,
        message_text: str,
        diagram_code: str,
        chat_id: int | None = None
) -> tuple[int, AsyncGenerator[str, None]]:
    """
    Бизнес-логика обработки сообщения от пользователя.

    Возвращает:
        tuple[int, AsyncGenerator]: ID чата и генератор потока ответа LLM.

    Raises:
        APIKeyNotConfiguredError: Если у пользователя нет API ключа для провайдера.
    """
    # 1. Проверка бизнес-правила: есть ли ключ?
    api_key = user.api_keys.get(provider)
    if not api_key:
        raise APIKeyNotConfiguredError(provider=provider)

    # 2. Работа с БД (создание чата и сохранение вопроса)
    chat = await crud.get_or_create_chat(db, user.id, chat_id)

    user_msg = Message(chat_id=chat.id, role="user", content=message_text)
    db.add(user_msg)
    await db.commit()

    # 3. Формирование контекста
    history = await crud.get_chat_history(db, chat.id, limit=10)
    messages_context = [
        {"role": "system", "content": SYSTEM_PROMPT.format(diagram_code=diagram_code)}
    ]
    messages_context.extend(history)

    # 4. Инициализация LLM генератора
    # Обратите внимание: мы передаем db в генератор. SQLAlchemy 2.0 AsyncSession
    # безопасно работает внутри yield, если используется expire_on_commit=False [web:116].
    llm_generator = generate_and_save_response(
        db=db,
        chat_id=chat.id,
        api_key=api_key,
        provider=provider,
        messages_context=messages_context
    )

    return chat.id, llm_generator