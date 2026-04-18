import logging
from typing import AsyncGenerator

from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.infrastructure.persistence import chat_repository as crud
from backend.app.infrastructure.persistence.users_models import User
from backend.app.application.users import settings_services
from backend.app.domain.chat.exceptions import APIKeyNotConfiguredError
from backend.app.infrastructure.llm import client as llm_client

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


async def _generate_and_persist_response(
    db: AsyncSession,
    chat_id: int,
    api_key: str,
    provider: str,
    model: str | None,
    messages_context: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    """Оркестрация: стримит ответ LLM, параллельно форматирует SSE и сохраняет финальный текст.

    Инфраструктурные детали (сетевой поток, SSE-форматирование) живут в
    ``infrastructure.llm.client``; запись сообщения в БД — в ``chat_repository``.
    Эта функция связывает их в единый use case.
    """
    config = llm_client.get_provider_config(provider)
    if not config:
        error_msg = f"Провайдер '{provider}' не поддерживается."
        logger.error("[LLM] %s", error_msg)
        yield llm_client.format_sse({"error": error_msg})
        yield llm_client.format_sse("[DONE]")
        return

    model_name = model or config["default_model"]
    logger.info(
        "[LLM] start provider=%s model=%s messages=%s",
        provider,
        model_name,
        len(messages_context),
    )

    full_response_chunks: list[str] = []
    chunk_count = 0

    try:
        async for content in llm_client.stream_provider_response(
            api_key=api_key,
            provider=provider,
            model_name=model_name,
            messages_context=messages_context,
        ):
            chunk_count += 1
            if chunk_count == 1:
                logger.info(
                    "[LLM] first_chunk provider=%s model=%s",
                    provider,
                    model_name,
                )
            full_response_chunks.append(content)
            yield llm_client.format_sse({"content": content})

        logger.info("[LLM] complete provider=%s chunks=%s", provider, chunk_count)

    except RateLimitError as exc:
        logger.warning("[LLM] rate_limited provider=%s model=%s", provider, model_name)
        error_msg = llm_client.build_rate_limit_message(provider, model_name, exc)
        full_response_chunks.append(error_msg)
        yield llm_client.format_sse({"error": error_msg})

    except Exception as exc:
        logger.exception("[LLM] error provider=%s", provider)
        error_msg = (
            f"[Ошибка генерации ответа от {config['name']}: {str(exc) or 'unknown error'}]"
        )
        full_response_chunks.append(error_msg)
        yield llm_client.format_sse({"error": error_msg})

    finally:
        yield llm_client.format_sse("[DONE]")

        if full_response_chunks:
            complete_text = "".join(full_response_chunks)
            logger.info(
                "[LLM] saved chat_id=%s chars=%s",
                chat_id,
                len(complete_text),
            )
            await crud.add_message(
                db=db, chat_id=chat_id, role="assistant", content=complete_text
            )


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

    # 1. Получаем API ключ через сервис настроек (не напрямую в репозиторий)
    api_key = await settings_services.get_api_key_for_provider(
        db, user_id=user.id, provider=provider
    )
    if not api_key:
        logger.warning(
            "[chat.service] missing api_key for provider=%s user_id=%s",
            provider,
            user.id,
        )
        raise APIKeyNotConfiguredError(provider=provider)

    # 2. Работа с БД (создание чата и сохранение вопроса)
    chat = await crud.get_or_create_chat(db, user.id, normalized_chat_id)
    if (
        chat.title == "Новый анализ"
        and normalized_chat_id is None
        and message_text.strip()
    ):
        await crud.update_chat_title_object(db, chat, _build_chat_title(message_text))

    await crud.add_message(db=db, chat_id=chat.id, role="user", content=message_text)

    # 3. Формирование контекста
    history = await crud.get_chat_history(db, chat.id, limit=10)
    messages_context = [
        {"role": "system", "content": SYSTEM_PROMPT.format(diagram_code=diagram_code)}
    ]
    messages_context.extend(history)

    # 4. Инициализация LLM генератора
    # Обратите внимание: мы передаем db в генератор. SQLAlchemy 2.0 AsyncSession
    # безопасно работает внутри yield, если используется expire_on_commit=False [web:116].
    llm_generator = _generate_and_persist_response(
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
