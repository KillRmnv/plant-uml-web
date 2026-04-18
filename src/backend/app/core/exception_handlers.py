from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

# Импортируем наши доменные ошибки
from backend.app.domain.users.exceptions import (
    UserAlreadyExistsError,
    UserNotFoundError,
    InvalidCredentialsError,
    ProviderNotSupportedError,
    ProviderModelsUnavailableError,
    ProviderAPIError,
)
from backend.app.domain.chat.exceptions import (
    APIKeyNotConfiguredError,
    ChatAccessDeniedError,
    LLMProviderError,
)


def setup_exception_handlers(app: FastAPI) -> None:
    """Функция регистрирует все кастомные обработчики ошибок в приложении."""

    # -- Обработчики Users --
    @app.exception_handler(UserAlreadyExistsError)
    async def user_exists_handler(request: Request, exc: UserAlreadyExistsError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT, content={"detail": exc.message}
        )

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(
        request: Request, exc: InvalidCredentialsError
    ):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": exc.message},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(UserNotFoundError)
    async def user_not_found_handler(request: Request, exc: UserNotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND, content={"detail": exc.message}
        )

    # -- Обработчики Chat --
    @app.exception_handler(APIKeyNotConfiguredError)
    async def api_key_handler(request: Request, exc: APIKeyNotConfiguredError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST, content={"detail": exc.message}
        )

    @app.exception_handler(ChatAccessDeniedError)
    async def chat_access_handler(request: Request, exc: ChatAccessDeniedError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN, content={"detail": exc.message}
        )

    @app.exception_handler(LLMProviderError)
    async def llm_error_handler(request: Request, exc: LLMProviderError):
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY, content={"detail": exc.message}
        )

    # -- Обработчики LLM-провайдеров (работа с настройками/моделями) --
    @app.exception_handler(ProviderNotSupportedError)
    async def provider_not_supported_handler(
        request: Request, exc: ProviderNotSupportedError
    ):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": exc.message, "models": []},
        )

    @app.exception_handler(ProviderModelsUnavailableError)
    async def provider_models_unavailable_handler(
        request: Request, exc: ProviderModelsUnavailableError
    ):
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"detail": exc.message, "models": []},
        )

    @app.exception_handler(ProviderAPIError)
    async def provider_api_error_handler(
        request: Request, exc: ProviderAPIError
    ):
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"detail": exc.message, "models": []},
        )
