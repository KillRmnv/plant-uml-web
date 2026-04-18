"""SQLAlchemy-реализация репозитория настроек пользователя.

Публичные функции возвращают доменные сущности ``UserSettings``.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging

from backend.app.infrastructure.persistence.users_models import (
    UserSettings as UserSettingsORM,
)
from backend.app.domain.users.entities import UserSettings
from backend.app.domain.users.interfaces import IUserSettingsRepository

logger = logging.getLogger(__name__)


def _to_domain(orm: UserSettingsORM | None) -> UserSettings | None:
    if orm is None:
        return None
    return UserSettings(
        id=orm.id,
        user_id=orm.user_id,
        provider=orm.provider,
        model=orm.model,
        auto_save=orm.auto_save,
        api_keys=dict(orm.api_keys or {}),
    )


async def get_settings_by_user_id(
    db: AsyncSession, user_id: int
) -> UserSettings | None:
    logger.debug(f"Fetching settings for user_id: {user_id}")
    stmt = select(UserSettingsORM).where(UserSettingsORM.user_id == user_id)
    result = await db.execute(stmt)
    return _to_domain(result.scalar_one_or_none())


async def create_or_update_settings(
    db: AsyncSession,
    user_id: int,
    provider: str | None = None,
    model: str | None = None,
    auto_save: bool | None = None,
    api_keys: dict | None = None,
) -> UserSettings:
    logger.info(f"Creating/updating settings for user_id: {user_id}")

    stmt = select(UserSettingsORM).where(UserSettingsORM.user_id == user_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()

    if settings:
        if provider is not None:
            settings.provider = provider
        if model is not None:
            settings.model = model
        if auto_save is not None:
            settings.auto_save = auto_save
        if api_keys is not None:
            existing_keys = dict(settings.api_keys or {})
            existing_keys.update(api_keys)
            settings.api_keys = existing_keys
    else:
        settings = UserSettingsORM(
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
        domain = _to_domain(settings)
        assert domain is not None
        return domain
    except IntegrityError as e:
        await db.rollback()
        logger.error(f"Error saving settings: {e}")
        raise


class SqlAlchemyUserSettingsRepository(IUserSettingsRepository):
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_by_user_id(self, user_id: int) -> UserSettings | None:
        return await get_settings_by_user_id(self._db, user_id)

    async def create_or_update(
        self,
        user_id: int,
        provider: str | None = None,
        model: str | None = None,
        auto_save: bool | None = None,
        api_keys: dict | None = None,
    ) -> UserSettings:
        return await create_or_update_settings(
            self._db,
            user_id=user_id,
            provider=provider,
            model=model,
            auto_save=auto_save,
            api_keys=api_keys,
        )
