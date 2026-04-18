import logging
import time

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.domains.users import settings_crud, schemas
from backend.app.domains.users.models import UserSettings
from backend.app.domains.users.exceptions import (
    APIKeyNotConfiguredError,
    ProviderNotSupportedError,
    AnthropicModelsNotSupportedError,
    ProviderAPIError,
    ProviderConnectionError,
)
from backend.app.integrations.llm.client import (
    get_provider_config,
    list_available_providers,
)

logger = logging.getLogger(__name__)

PROVIDERS = list_available_providers()


async def get_or_create_settings(db: AsyncSession, user_id: int) -> UserSettings:
    """Получить настройки пользователя или создать пустые по умолчанию."""
    settings = await settings_crud.get_settings_by_user_id(db, user_id)
    if not settings:
        settings = await settings_crud.create_or_update_settings(db, user_id)
    return settings


async def save_settings(
    db: AsyncSession, user_id: int, data: schemas.UserSettingsCreate
) -> UserSettings:
    """Сохранить настройки пользователя."""
    existing = await settings_crud.get_settings_by_user_id(db, user_id)

    update_data = {}
    if data.provider is not None:
        update_data["provider"] = data.provider
    if data.model is not None:
        update_data["model"] = data.model
    if data.auto_save is not None:
        update_data["auto_save"] = data.auto_save
    if data.api_keys is not None:
        update_data["api_keys"] = data.api_keys

    if not existing and not update_data:
        return await settings_crud.create_or_update_settings(db, user_id)

    return await settings_crud.create_or_update_settings(
        db=db,
        user_id=user_id,
        **update_data,
    )


async def get_configured_providers(db: AsyncSession, user_id: int) -> list[dict]:
    """Вернуть список провайдеров с учётом настроенных ключей."""
    settings = await settings_crud.get_settings_by_user_id(db, user_id)

    configured_providers = []
    if settings and settings.api_keys:
        for provider in PROVIDERS:
            if (
                provider["id"] in settings.api_keys
                and settings.api_keys[provider["id"]]
            ):
                configured_providers.append(provider)
        if configured_providers:
            return configured_providers

    return PROVIDERS


async def get_api_key(db: AsyncSession, user_id: int, provider: str) -> str:
    """Вернуть API ключ пользователя или бросить APIKeyNotConfiguredError."""
    settings = await settings_crud.get_settings_by_user_id(db, user_id)
    if not settings or not settings.api_keys:
        raise APIKeyNotConfiguredError(provider=provider)
    api_key = settings.api_keys.get(provider)
    if not api_key:
        raise APIKeyNotConfiguredError(provider=provider)
    return api_key


async def list_provider_models(
    db: AsyncSession, user_id: int, provider: str
) -> list[dict]:
    """Получить список моделей провайдера.

    Raises:
        APIKeyNotConfiguredError: если у пользователя нет ключа для provider.
        ProviderNotSupportedError: если provider не поддерживается.
        AnthropicModelsNotSupportedError: anthropic не имеет публичного API списка моделей.
        ProviderAPIError: при HTTP-ошибке от API провайдера.
        ProviderConnectionError: при сетевой ошибке.
    """
    start_time = time.time()

    api_key = await get_api_key(db, user_id, provider)

    provider_config = get_provider_config(provider)
    if not provider_config:
        logger.warning(f"[list_provider_models] Provider not supported: {provider}")
        raise ProviderNotSupportedError(provider=provider)

    if provider == "anthropic":
        elapsed = time.time() - start_time
        logger.info(
            f"[list_provider_models] Anthropic - no public API ({elapsed:.2f}s)"
        )
        raise AnthropicModelsNotSupportedError()

    try:
        if provider == "openai":
            logger.info("[list_provider_models] Fetching models from OpenAI API")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0,
                )
                if response.status_code != 200:
                    elapsed = time.time() - start_time
                    logger.error(
                        f"[list_provider_models] OpenAI error: {response.status_code} - {response.text} ({elapsed:.2f}s)"
                    )
                    raise ProviderAPIError(
                        provider=provider, status_code=response.status_code
                    )
                data = response.json()
                models = [
                    {"id": m["id"], "name": m["id"]}
                    for m in data.get("data", [])
                    if "gpt" in m["id"].lower()
                ]
                elapsed = time.time() - start_time
                logger.info(
                    f"[list_provider_models] OpenAI models count: {len(models)} ({elapsed:.2f}s)"
                )
                return models

        logger.info(
            f"[list_provider_models] Fetching models from {provider} ({provider_config['base_url']})"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{provider_config['base_url']}/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            if response.status_code != 200:
                elapsed = time.time() - start_time
                logger.error(
                    f"[list_provider_models] {provider} error: {response.status_code} - {response.text} ({elapsed:.2f}s)"
                )
                raise ProviderAPIError(
                    provider=provider, status_code=response.status_code
                )
            data = response.json()
            models = [
                {
                    "id": m["id"],
                    "name": m.get("id", m.get("name", "Unknown")),
                }
                for m in data.get("data", [])
            ]
            elapsed = time.time() - start_time
            logger.info(
                f"[list_provider_models] {provider} models count: {len(models)} ({elapsed:.2f}s)"
            )
            return models

    except httpx.RequestError as e:
        elapsed = time.time() - start_time
        logger.error(
            f"[list_provider_models] Request error for {provider}: {e} ({elapsed:.2f}s)"
        )
        raise ProviderConnectionError(provider=provider, message=str(e))
