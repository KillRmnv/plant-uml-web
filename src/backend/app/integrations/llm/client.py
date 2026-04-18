import json
import logging
from typing import Any, AsyncGenerator

import httpx
from openai import AsyncOpenAI, RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.domains.chat.models import Message

logger = logging.getLogger(__name__)

PROVIDER_CONFIG: dict[str, dict[str, Any]] = {
    "openai": {
        "name": "OpenAI",
        "base_url": None,
        "default_model": "gpt-4o",
        "api_style": "openai",
    },
    "anthropic": {
        "name": "Anthropic",
        "base_url": "https://api.anthropic.com/v1",
        "default_model": "claude-3-5-sonnet-latest",
        "api_style": "anthropic",
    },
    "mistral": {
        "name": "Mistral",
        "base_url": "https://api.mistral.ai/v1",
        "default_model": "mistral-large-latest",
        "api_style": "openai",
    },
    "openrouter": {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "openai/gpt-4o",
        "api_style": "openai",
    },
    "localai": {
        "name": "LocalAI",
        "base_url": "http://localhost:8080/v1",
        "default_model": "gpt-3.5-turbo",
        "api_style": "openai",
    },
}

def get_provider_config(provider: str) -> dict[str, Any] | None:
    return PROVIDER_CONFIG.get(provider)


def list_available_providers() -> list[dict[str, str]]:
    return [
        {"id": provider_id, "name": config["name"]}
        for provider_id, config in PROVIDER_CONFIG.items()
    ]


def _format_sse(data: dict[str, Any] | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _build_rate_limit_message(provider: str, model_name: str, exc: RateLimitError) -> str:
    provider_name = PROVIDER_CONFIG.get(provider, {}).get("name", provider)
    base_message = (
        f"[{provider_name}] Модель временно недоступна из-за rate limit. "
        "Повторите запрос позже."
    )

    if provider == "openrouter" and model_name.endswith(":free"):
        return (
            f"{base_message} Бесплатная модель `{model_name}` сейчас ограничена у провайдера. "
            "Попробуйте позже или выберите платную версию этой модели."
        )

    response = getattr(exc, "response", None)
    if response is not None:
        retry_after = response.headers.get("retry-after")
        if retry_after:
            return f"{base_message} Retry-After: {retry_after} сек."

    return base_message


async def _stream_openai_compatible_response(
    api_key: str,
    provider: str,
    model_name: str,
    messages_context: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    config = PROVIDER_CONFIG[provider]
    client = AsyncOpenAI(api_key=api_key, base_url=config["base_url"])

    stream = await client.chat.completions.create(
        model=model_name,
        messages=messages_context,
        stream=True,
        temperature=0.3,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        content = delta.content
        if isinstance(content, list):
            content = "".join(
                part.text for part in content if hasattr(part, "text") and part.text
            )
        if content:
            yield content


def _prepare_anthropic_payload(
    model_name: str,
    messages_context: list[dict[str, str]],
) -> dict[str, Any]:
    system_parts: list[str] = []
    messages: list[dict[str, str]] = []

    for message in messages_context:
        role = message["role"]
        content = message["content"]
        if role == "system":
            system_parts.append(content)
            continue
        if role not in {"user", "assistant"}:
            continue
        messages.append({"role": role, "content": content})

    payload: dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "max_tokens": 2048,
        "temperature": 0.3,
        "stream": True,
    }
    if system_parts:
        payload["system"] = "\n\n".join(system_parts)
    return payload


async def _stream_anthropic_response(
    api_key: str,
    model_name: str,
    messages_context: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    payload = _prepare_anthropic_payload(model_name, messages_context)
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
        ) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue

                raw_data = line[6:]
                if raw_data == "[DONE]":
                    break

                event = json.loads(raw_data)
                event_type = event.get("type")

                if event_type == "content_block_delta":
                    text = event.get("delta", {}).get("text")
                    if text:
                        yield text

                elif event_type == "content_block_start":
                    text = event.get("content_block", {}).get("text")
                    if text:
                        yield text


async def _stream_provider_response(
    api_key: str,
    provider: str,
    model_name: str,
    messages_context: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    config = get_provider_config(provider)
    if not config:
        raise ValueError(f"Unsupported provider: {provider}")

    if config["api_style"] == "anthropic":
        async for chunk in _stream_anthropic_response(
            api_key=api_key,
            model_name=model_name,
            messages_context=messages_context,
        ):
            yield chunk
        return

    async for chunk in _stream_openai_compatible_response(
        api_key=api_key,
        provider=provider,
        model_name=model_name,
        messages_context=messages_context,
    ):
        yield chunk


async def generate_and_save_response(
    db: AsyncSession,
    chat_id: int,
    api_key: str,
    provider: str,
    model: str | None,
    messages_context: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    """
    Вызывает LLM, стримит ответ через SSE и в конце сохраняет его в БД.
    """
    config = get_provider_config(provider)
    if not config:
        error_msg = f"Провайдер '{provider}' не поддерживается."
        logger.error("[LLM] %s", error_msg)
        yield _format_sse({"error": error_msg})
        yield _format_sse("[DONE]")
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
        async for content in _stream_provider_response(
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
            yield _format_sse({"content": content})

        logger.info("[LLM] complete provider=%s chunks=%s", provider, chunk_count)

    except RateLimitError as exc:
        logger.warning("[LLM] rate_limited provider=%s model=%s", provider, model_name)
        error_msg = _build_rate_limit_message(provider, model_name, exc)
        full_response_chunks.append(error_msg)
        yield _format_sse({"error": error_msg})

    except Exception:
        logger.exception("[LLM] error provider=%s", provider)
        error_msg = f"[Ошибка генерации ответа от {config['name']}.]"
        full_response_chunks.append(error_msg)
        yield _format_sse({"error": error_msg})

    finally:
        yield _format_sse("[DONE]")

        if full_response_chunks:
            complete_text = "".join(full_response_chunks)
            logger.info(
                "[LLM] saved chat_id=%s chars=%s",
                chat_id,
                len(complete_text),
            )
            assistant_msg = Message(
                chat_id=chat_id,
                role="assistant",
                content=complete_text,
            )
            db.add(assistant_msg)
            await db.commit()
