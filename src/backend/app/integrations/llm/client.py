import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.domains.chat.models import Message

logger = logging.getLogger(__name__)


async def generate_and_save_response(
        db: AsyncSession,
        chat_id: int,
        api_key: str,
        provider: str,
        messages_context: list[dict]
) -> AsyncGenerator[str, None]:
    """
    Вызывает LLM, транслирует ответ (yield) и в конце сохраняет его в БД.
    """
    # Настройка клиента (как в прошлом примере)
    base_url = "https://api.mistral.ai/v1" if provider == "mistral" else None
    model = "mistral-large-latest" if provider == "mistral" else "gpt-4o"

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    full_response_chunks = []

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages_context,
            stream=True,
            temperature=0.3
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_response_chunks.append(content)
                yield content

    except Exception as e:
        logger.error(f"LLM Stream Error: {str(e)}")
        error_msg = "\n\n[Ошибка генерации ответа. Пожалуйста, попробуйте позже.]"
        full_response_chunks.append(error_msg)
        yield error_msg

    finally:
        # Этот блок гарантированно выполнится, когда стрим закончится
        # ИЛИ если пользователь закроет вкладку браузера посередине генерации!
        if full_response_chunks:
            complete_text = "".join(full_response_chunks)
            assistant_msg = Message(
                chat_id=chat_id,
                role="assistant",
                content=complete_text
            )
            db.add(assistant_msg)
            # Внутри finally используем commit безопасно, т.к. генератор
            # управляется контекстом FastAPI Depends(get_db)
            await db.commit()