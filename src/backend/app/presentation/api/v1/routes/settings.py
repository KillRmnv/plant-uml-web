import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.infrastructure.db.database import get_db
from backend.app.presentation.api.dependencies import get_current_user
from backend.app.domain.users.entities import User
from backend.app.application.users import schemas
from backend.app.application.users import settings_services
from backend.app.application.llm import llm_services

logger = logging.getLogger(__name__)

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=schemas.UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить настройки текущего пользователя."""
    logger.info(f"Getting settings for user: {current_user.login}")
    return await settings_services.get_or_create_user_settings(db, current_user.id)


@router.post("/settings", response_model=schemas.UserSettingsResponse)
async def save_settings(
    settings_data: schemas.UserSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Сохранить настройки текущего пользователя."""
    logger.info(f"Saving settings for user: {current_user.login}")
    return await settings_services.save_user_settings(
        db, current_user.id, settings_data
    )


@router.get("/assistant/providers")
async def get_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить доступные провайдеры AI."""
    logger.info(f"[get_providers] Request for user: {current_user.login}")
    return await llm_services.list_configured_providers(db, current_user.id)


@router.get("/assistant/models")
async def get_models(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить модели для указанного провайдера."""
    logger.info(
        f"[get_models] Request for provider: {provider}, user: {current_user.login}"
    )
    models = await llm_services.list_models_for_provider(
        db, current_user.id, provider
    )
    return {"models": models}
