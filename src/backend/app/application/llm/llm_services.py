"""Сервисы для работы с LLM-провайдерами и их моделями.

Сервис делегирует технические детали (HTTP-запросы, форматы ответов)
``infrastructure/llm/client.py`` и не знает ни про httpx, ни про HTTP-статусы.
Для получения API-ключа пользователя используется ``settings_services``.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.application.users import settings_services
from backend.app.domain.users.exceptions import APIKeyNotConfiguredError
from backend.app.infrastructure.llm import client as llm_client

logger = logging.getLogger(__name__)


async def list_configured_providers(
    db: AsyncSession, user_id: int
) -> list[dict[str, str]]:
    """Провайдеры, у которых у пользователя есть API-ключ.

    Если ни один не настроен — возвращает все поддерживаемые провайдеры
    (для выбора при первом заходе).
    """
    all_providers = llm_client.list_available_providers()
    settings = await settings_services.get_settings(db, user_id)

    configured: list[dict[str, str]] = []
    if settings and settings.api_keys:
        for provider in all_providers:
            if settings.api_keys.get(provider["id"]):
                configured.append(provider)
    return configured or all_providers


async def list_models_for_provider(
    db: AsyncSession, user_id: int, provider: str
) -> list[dict[str, str]]:
    """Список моделей провайдера.

    Бросает доменные исключения (APIKeyNotConfiguredError,
    ProviderNotSupportedError, ProviderModelsUnavailableError,
    ProviderAPIError); presentation-слой преобразует их в HTTP-ответы.
    """
    api_key = await settings_services.get_api_key_for_provider(db, user_id, provider)
    if not api_key:
        logger.warning(
            "[list_models_for_provider] No API key for provider: %s", provider
        )
        raise APIKeyNotConfiguredError(provider)

    logger.info("[list_models_for_provider] Fetching models for %s", provider)
    return await llm_client.fetch_models(provider=provider, api_key=api_key)
