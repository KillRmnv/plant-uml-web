import logging
import time

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.database import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.users import schemas
from backend.app.domains.users import settings_crud
from backend.app.integrations.llm.client import (
    get_provider_config,
    list_available_providers,
    list_openai_compatible_providers,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["settings"])

PROVIDERS = list_available_providers()
OPENAI_COMPATIBLE_PROVIDERS = list_openai_compatible_providers()


@router.get("/settings", response_model=schemas.UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить настройки текущего пользователя."""
    logger.info(f"Getting settings for user: {current_user.login}")

    settings = await settings_crud.get_settings_by_user_id(db, current_user.id)

    if not settings:
        # Создаем пустые настройки по умолчанию
        settings = await settings_crud.create_or_update_settings(db, current_user.id)

    return settings


@router.post("/settings", response_model=schemas.UserSettingsResponse)
async def save_settings(
    settings_data: schemas.UserSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Сохранить настройки текущего пользователя."""
    logger.info(f"Saving settings for user: {current_user.login}")

    # Проверяем, существуют ли уже настройки
    existing = await settings_crud.get_settings_by_user_id(db, current_user.id)

    update_data = {}
    # Добавляем только если значение передано (не None)
    if settings_data.provider is not None:
        update_data["provider"] = settings_data.provider
    if settings_data.model is not None:
        update_data["model"] = settings_data.model
    if settings_data.auto_save is not None:
        update_data["auto_save"] = settings_data.auto_save
    if settings_data.api_keys is not None:
        update_data["api_keys"] = settings_data.api_keys

    # Если настроек нет и данных нет - создаем пустые
    if not existing and not update_data:
        settings = await settings_crud.create_or_update_settings(db, current_user.id)
    else:
        settings = await settings_crud.create_or_update_settings(
            db=db,
            user_id=current_user.id,
            **update_data,
        )

    return settings


@router.get("/assistant/providers")
async def get_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить доступные провайдеры AI."""
    logger.info(f"[get_providers] Request for user: {current_user.login}")

    # Проверяем, какие провайдеры настроены у пользователя
    settings = await settings_crud.get_settings_by_user_id(db, current_user.id)
    logger.info(
        f"[get_providers] Settings: {settings is not None}, api_keys: {settings.api_keys if settings else None}"
    )

    configured_providers = []

    if settings and settings.api_keys:
        for provider in PROVIDERS:
            if (
                provider["id"] in settings.api_keys
                and settings.api_keys[provider["id"]]
            ):
                configured_providers.append(provider)
        if configured_providers:
            logger.info(
                f"[get_providers] Configured providers: {[p['id'] for p in configured_providers]}"
            )
            return configured_providers

    # Нет настроенных провайдеров - возвращаем все
    all_providers = PROVIDERS
    logger.info(
        f"[get_providers] Returning all providers: {[p['id'] for p in all_providers]}"
    )
    return all_providers


@router.get("/assistant/models")
async def get_models(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить модели для указанного провайдера."""
    start_time = time.time()

    logger.info(
        f"[get_models] Request for provider: {provider}, user: {current_user.login}"
    )

    # Получаем настройки пользователя
    settings = await settings_crud.get_settings_by_user_id(db, current_user.id)
    logger.info(
        f"[get_models] Settings found: {settings is not None}, api_keys: {settings.api_keys if settings else None}"
    )

    if not settings or not settings.api_keys or not settings.api_keys.get(provider):
        logger.warning(f"[get_models] No API key for provider: {provider}")
        return {
            "detail": "API ключ не настроен. Добавьте ключ в настройках.",
            "models": [],
        }

    provider_config = get_provider_config(provider)
    if not provider_config:
        logger.warning(f"[get_models] Provider not supported: {provider}")
        return {
            "detail": f"Провайдер '{provider}' не поддерживается",
            "models": [],
        }

    api_key = settings.api_keys.get(provider)
    logger.info(f"[get_models] Has API key for {provider}: {bool(api_key)}")

    # Делаем запрос к API провайдера для получения списка моделей
    try:
        import httpx

        if provider == "anthropic":
            elapsed = time.time() - start_time
            logger.info(f"[get_models] Anthropic - no public API ({elapsed:.2f}s)")
            return {
                "detail": "Anthropic не поддерживает API списка моделей. Укажите модель вручную.",
                "models": [],
            }

        if provider == "openai":
            logger.info(f"[get_models] Fetching models from OpenAI API")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0,
                )
                logger.info(
                    f"[get_models] OpenAI response status: {response.status_code}"
                )
                if response.status_code == 200:
                    data = response.json()
                    models = [
                        {"id": m["id"], "name": m["id"]}
                        for m in data.get("data", [])
                        if "gpt" in m["id"].lower()
                    ]
                    logger.info(f"[get_models] OpenAI models count: {len(models)}")
                    elapsed = time.time() - start_time
                    logger.info(f"[get_models] OpenAI total time: {elapsed:.2f}s")
                    return {"models": models}
                else:
                    elapsed = time.time() - start_time
                    logger.error(
                        f"[get_models] OpenAI error: {response.status_code} - {response.text} ({elapsed:.2f}s)"
                    )
                    return {
                        "detail": f"Ошибка API: {response.status_code}",
                        "models": [],
                    }

        logger.info(
            f"[get_models] Fetching models from {provider} ({provider_config['base_url']})"
        )
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{provider_config['base_url']}/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(
                    f"[get_models] Raw response data keys: {list(data.keys())}"
                )
                logger.info(
                    f"[get_models] Raw response data count: {len(data.get('data', []))}"
                )
                models = [
                    {
                        "id": m["id"],
                        "name": m.get("id", m.get("name", "Unknown")),
                    }
                    for m in data.get("data", [])
                ]
                logger.info(f"[get_models] {provider} models count: {len(models)}")
                logger.info(f"[get_models] First 3 models: {models[:3]}")
                elapsed = time.time() - start_time
                logger.info(
                    f"[get_models] Total request time for {provider}: {elapsed:.2f}s"
                )
                return {"models": models}

            elapsed = time.time() - start_time
            logger.error(
                f"[get_models] {provider} error: {response.status_code} - {response.text} ({elapsed:.2f}s)"
            )
            return {
                "detail": f"Ошибка API: {response.status_code}",
                "models": [],
            }

    except httpx.RequestError as e:
        elapsed = time.time() - start_time
        logger.error(f"[get_models] Request error for {provider}: {e} ({elapsed:.2f}s)")
        return {
            "detail": f"Ошибка при обращении к API провайдера: {str(e)}",
            "models": [],
        }
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(
            f"[get_models] Unexpected error for {provider}: {e} ({elapsed:.2f}s)"
        )
        return {"detail": f"Внутренняя ошибка: {str(e)}", "models": []}
