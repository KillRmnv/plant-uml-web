import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.database import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.users import schemas, settings_service
from backend.app.domains.users.exceptions import (
    APIKeyNotConfiguredError,
    ProviderNotSupportedError,
    AnthropicModelsNotSupportedError,
    ProviderAPIError,
    ProviderConnectionError,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=schemas.UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить настройки текущего пользователя."""
    logger.info(f"Getting settings for user: {current_user.login}")
    return await settings_service.get_or_create_settings(db, current_user.id)


@router.post("/settings", response_model=schemas.UserSettingsResponse)
async def save_settings(
    settings_data: schemas.UserSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Сохранить настройки текущего пользователя."""
    logger.info(f"Saving settings for user: {current_user.login}")
    return await settings_service.save_settings(db, current_user.id, settings_data)


@router.get("/assistant/providers")
async def get_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить доступные провайдеры AI."""
    logger.info(f"[get_providers] Request for user: {current_user.login}")
    return await settings_service.get_configured_providers(db, current_user.id)


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
    try:
        models = await settings_service.list_provider_models(
            db, current_user.id, provider
        )
        return {"models": models}
    except APIKeyNotConfiguredError as e:
        raise HTTPException(
            status_code=422,
            detail=f"API ключ не настроен для провайдера '{e.provider}'.",
        )
    except ProviderNotSupportedError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Провайдер '{e.provider}' не поддерживается",
        )
    except AnthropicModelsNotSupportedError:
        raise HTTPException(
            status_code=400,
            detail="Anthropic не поддерживает API списка моделей. Укажите модель вручную.",
        )
    except ProviderAPIError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка API провайдера '{e.provider}': {e.status_code}",
        )
    except ProviderConnectionError as e:
        raise HTTPException(
            status_code=504,
            detail=f"Ошибка соединения с провайдером '{e.provider}'.",
        )
