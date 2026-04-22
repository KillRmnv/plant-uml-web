import logging

from fastapi import APIRouter, HTTPException, Query, status

from backend.app.integrations.llm.client import (
    list_available_providers,
    list_provider_models,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["assistant"])


@router.get("/assistant/providers")
async def get_providers():
    """Получить доступные AI провайдеры."""
    logger.info("[get_providers] Request for providers list")
    try:
        providers = list_available_providers()
        logger.info(f"[get_providers] Returning {len(providers)} providers")
        return providers
    except Exception:
        logger.exception("[get_providers] Failed to retrieve providers list")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить список провайдеров.",
        )


@router.get("/assistant/models")
async def get_models(provider: str = Query(..., description="ID провайдера")):
    """Получить модели для указанного провайдера."""
    logger.info(f"[get_models] Request for provider: {provider}")
    try:
        models = await list_provider_models(provider)
        return {"models": models}
    except Exception as e:
        logger.exception(f"[get_models] Failed for provider={provider}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось получить список моделей: {str(e)}",
        )
