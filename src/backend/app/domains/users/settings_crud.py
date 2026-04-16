from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging

from backend.app.domains.users.models import UserSettings

logger = logging.getLogger(__name__)


async def get_settings_by_user_id(
    db: AsyncSession, user_id: int
) -> UserSettings | None:
    """Получить настройки пользователя по ID."""
    logger.debug(f"Fetching settings for user_id: {user_id}")
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_or_update_settings(
    db: AsyncSession,
    user_id: int,
    provider: str | None = None,
    model: str | None = None,
    auto_save: bool | None = None,
    api_keys: dict | None = None,
) -> UserSettings:
    """Создать или обновить настройки пользователя."""
    logger.info(f"Creating/updating settings for user_id: {user_id}")

    # Попробуем найти существующие настройки
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()

    if settings:
        # Обновляем только переданные значения (не None)
        if provider is not None:
            settings.provider = provider
        if model is not None:
            settings.model = model
        if auto_save is not None:
            settings.auto_save = auto_save
        if api_keys is not None:
            # Обновляем только переданные ключи
            existing_keys = dict(settings.api_keys or {})
            existing_keys.update(api_keys)
            settings.api_keys = existing_keys
    else:
        # Создаем новые
        settings = UserSettings(
            user_id=user_id,
            provider=provider,
            model=model,
            auto_save=auto_save if auto_save is not None else True,
            api_keys=api_keys or {},
        )
        db.add(settings)

    try:
        await db.commit()
        await db.refresh(settings)
        logger.info(f"Settings saved for user_id: {user_id}")
        return settings
    except IntegrityError as e:
        await db.rollback()
        logger.error(f"Error saving settings: {e}")
        raise
