"""Сервисы пользовательских настроек.

Отвечают только за чтение/запись настроек пользователя и доступ к
API-ключам. Работа с LLM-провайдерами и их моделями вынесена в
``application/llm/llm_services.py``.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.application.users import schemas
from backend.app.domain.users.entities import UserSettings
from backend.app.infrastructure.persistence import settings_repository

logger = logging.getLogger(__name__)


async def get_settings(db: AsyncSession, user_id: int) -> UserSettings | None:
    """Возвращает настройки пользователя или None, если их нет."""
    return await settings_repository.get_settings_by_user_id(db, user_id)


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
    """Сохраняет переданные настройки, не затрагивая поля со значением None."""
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
    """Получить API ключ пользователя для указанного провайдера."""
    settings = await settings_repository.get_settings_by_user_id(db, user_id)
    if not settings or not settings.api_keys:
        return None
    key = settings.api_keys.get(provider)
    return key or None
