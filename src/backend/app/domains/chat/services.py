import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.domains.chat import crud
from backend.app.domains.chat.models import Message
from backend.app.domains.users.models import User
from backend.app.domains.users import settings_crud
from backend.app.integrations.llm.client import generate_and_save_response
from backend.app.domains.chat.exceptions import APIKeyNotConfiguredError

logger = logging.getLogger(__name__)
PG_INT32_MAX = 2_147_483_647

SYSTEM_PROMPT = """Вы — эксперт-аналитик систем OSTIS.
Отвечайте четко, опираясь на текущую диаграмму:
```plantuml
{diagram_code}
```
"""


def _build_chat_title(message_text: str) -> str:
    first_sentence = message_text.split(".", 1)[0].split("?", 1)[0].split("!", 1)[0]
    title = first_sentence.strip() or "Новый анализ"
    return title[:47] + "..." if len(title) > 50 else title


def _normalize_chat_id(chat_id: int | None) -> int | None:
    if chat_id is None:
        return None
    if chat_id <= 0 or chat_id > PG_INT32_MAX:
        return None
    return chat_id


async def process_chat_consultation(
    db: AsyncSession,
    user: User,
    provider: str,
    model: str | None,
    message_text: str,
    diagram_code: str,
    chat_id: int | None = None,
) -> tuple[int, AsyncGenerator[str, None]]:
    """
    Бизнес-логика обработки сообщения от пользователя.

    Возвращает:
        tuple[int, AsyncGenerator]: ID чата и генератор потока ответа LLM.

    Raises:
        APIKeyNotConfiguredError: Если у пользователя нет API ключа для провайдера.
    """
    normalized_chat_id = _normalize_chat_id(chat_id)
    if chat_id != normalized_chat_id:
        logger.info(
            "[chat.service] chat_id normalized original=%s normalized=%s",
            chat_id,
            normalized_chat_id,
        )

    # 1. Получаем настройки пользователя для получения API ключа
    settings = await settings_crud.get_settings_by_user_id(db, user.id)

    if not settings or not settings.api_keys:
        logger.warning("[chat.service] missing settings for provider=%s user_id=%s", provider, user.id)
        raise APIKeyNotConfiguredError(provider=provider)

    api_key = settings.api_keys.get(provider)
    if not api_key:
        logger.warning("[chat.service] missing api_key for provider=%s user_id=%s", provider, user.id)
        raise APIKeyNotConfiguredError(provider=provider)

    # 2. Работа с БД (создание чата и сохранение вопроса)
    chat = await crud.get_or_create_chat(db, user.id, normalized_chat_id)
    if (
        chat.title == "Новый анализ"
        and normalized_chat_id is None
        and message_text.strip()
    ):
        chat.title = _build_chat_title(message_text)

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
        model=model,
        messages_context=messages_context,
    )
    return chat.id, llm_generator


async def list_user_chats(db: AsyncSession, user_id: int):
    chats = await crud.list_user_chats(db, user_id)
    responses = []
    for chat in chats:
        chat.preview = await crud.get_chat_preview(db, chat.id)  # type: ignore[attr-defined]
        responses.append(chat)
    return responses


async def create_user_chat(db: AsyncSession, user_id: int, title: str | None):
    return await crud.create_chat(db, user_id, title)


async def list_chat_messages(db: AsyncSession, user_id: int, chat_id: int):
    return await crud.get_chat_messages(db, user_id, chat_id)


async def delete_user_chat(db: AsyncSession, user_id: int, chat_id: int):
    await crud.delete_chat(db, user_id, chat_id)


async def update_user_chat_title(
    db: AsyncSession, user_id: int, chat_id: int, title: str
):
    return await crud.update_chat_title(db, user_id, chat_id, title)
