"""Сервисы пользовательских настроек.

Инкапсулируют работу с ``settings_repository`` и LLM-провайдерами, чтобы
роутеры (presentation) и другие сервисы не обращались к репозиторию напрямую.
"""

import logging
import time

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.application.users import schemas
from backend.app.infrastructure.llm import client as llm_client
from backend.app.infrastructure.persistence import settings_repository
from backend.app.infrastructure.persistence.users_models import UserSettings

logger = logging.getLogger(__name__)


async def get_or_create_user_settings(
    db: AsyncSession, user_id: int
) -> UserSettings:
    """Возвращает настройки пользователя, создавая пустую запись при её отсутствии."""
    settings = await settings_repository.get_settings_by_user_id(db, user_id)
    if settings is None:
        settings = await settings_repository.create_or_update_settings(db, user_id)
    return settings


async def save_user_settings(
    db: AsyncSession, user_id: int, settings_data: schemas.UserSettingsCreate
) -> UserSettings:
    """Сохраняет переданные настройки, не затрагивая поля, которые пришли как None."""
    existing = await settings_repository.get_settings_by_user_id(db, user_id)

    update_data: dict = {}
    if settings_data.provider is not None:
        update_data["provider"] = settings_data.provider
    if settings_data.model is not None:
        update_data["model"] = settings_data.model
    if settings_data.auto_save is not None:
        update_data["auto_save"] = settings_data.auto_save
    if settings_data.api_keys is not None:
        update_data["api_keys"] = settings_data.api_keys

    if not existing and not update_data:
        return await settings_repository.create_or_update_settings(db, user_id)

    return await settings_repository.create_or_update_settings(
        db=db, user_id=user_id, **update_data
    )


async def get_api_key_for_provider(
    db: AsyncSession, user_id: int, provider: str
) -> str | None:
    """Получить API ключ пользователя для указанного провайдера.

    Возвращает ``None``, если настроек нет или ключ для провайдера не задан.
    """
    settings = await settings_repository.get_settings_by_user_id(db, user_id)
    if not settings or not settings.api_keys:
        return None
    key = settings.api_keys.get(provider)
    return key or None


async def list_configured_providers(
    db: AsyncSession, user_id: int
) -> list[dict[str, str]]:
    """Список провайдеров, у которых у пользователя есть API-ключ.

    Если настроенных нет — возвращает все поддерживаемые провайдеры
    (для выбора в UI при первом заходе).
    """
    all_providers = llm_client.list_available_providers()
    settings = await settings_repository.get_settings_by_user_id(db, user_id)

    configured: list[dict[str, str]] = []
    if settings and settings.api_keys:
        for provider in all_providers:
            if settings.api_keys.get(provider["id"]):
                configured.append(provider)
    if configured:
        return configured
    return all_providers


async def list_models_for_provider(
    db: AsyncSession, user_id: int, provider: str
) -> dict:
    """Возвращает список моделей указанного провайдера, используя API-ключ пользователя.

    Формат ответа совпадает с контрактом исходного эндпоинта
    (``{"models": [...]}`` либо ``{"detail": "...", "models": []}``).
    """
    start_time = time.time()
    api_key = await get_api_key_for_provider(db, user_id, provider)
    if not api_key:
        logger.warning(f"[list_models_for_provider] No API key for provider: {provider}")
        return {
            "detail": "API ключ не настроен. Добавьте ключ в настройках.",
            "models": [],
        }

    provider_config = llm_client.get_provider_config(provider)
    if not provider_config:
        logger.warning(
            f"[list_models_for_provider] Provider not supported: {provider}"
        )
        return {
            "detail": f"Провайдер '{provider}' не поддерживается",
            "models": [],
        }

    try:
        if provider == "anthropic":
            elapsed = time.time() - start_time
            logger.info(
                f"[list_models_for_provider] Anthropic - no public API ({elapsed:.2f}s)"
            )
            return {
                "detail": "Anthropic не поддерживает API списка моделей. Укажите модель вручную.",
                "models": [],
            }

        if provider == "openai":
            logger.info("[list_models_for_provider] Fetching models from OpenAI API")
            models = await llm_client.fetch_openai_models(api_key)
            elapsed = time.time() - start_time
            logger.info(
                f"[list_models_for_provider] OpenAI models count: {len(models)} ({elapsed:.2f}s)"
            )
            return {"models": models}

        base_url = provider_config["base_url"]
        logger.info(
            f"[list_models_for_provider] Fetching models from {provider} ({base_url})"
        )
        models = await llm_client.fetch_openai_compatible_models(base_url, api_key)
        elapsed = time.time() - start_time
        logger.info(
            f"[list_models_for_provider] {provider} models count: {len(models)} ({elapsed:.2f}s)"
        )
        return {"models": models}

    except httpx.HTTPStatusError as e:
        elapsed = time.time() - start_time
        logger.error(
            f"[list_models_for_provider] {provider} error: "
            f"{e.response.status_code} - {e.response.text} ({elapsed:.2f}s)"
        )
        return {
            "detail": f"Ошибка API: {e.response.status_code}",
            "models": [],
        }
    except httpx.RequestError as e:
        elapsed = time.time() - start_time
        logger.error(
            f"[list_models_for_provider] Request error for {provider}: {e} ({elapsed:.2f}s)"
        )
        return {
            "detail": f"Ошибка при обращении к API провайдера: {str(e)}",
            "models": [],
        }
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            f"[list_models_for_provider] Unexpected error for {provider}: {e} ({elapsed:.2f}s)"
        )
        return {"detail": f"Внутренняя ошибка: {str(e)}", "models": []}
