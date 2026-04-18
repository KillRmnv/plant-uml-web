from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from backend.app.domains.users.exceptions import (
    APIKeyNotConfiguredError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from backend.app.domains.chat.exceptions import ChatAccessDeniedError


def setup_exception_handlers(app: FastAPI) -> None:
    """Регистрирует все кастомные обработчики доменных ошибок."""

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

    @app.exception_handler(APIKeyNotConfiguredError)
    async def api_key_handler(request: Request, exc: APIKeyNotConfiguredError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": f"API ключ не настроен для провайдера '{exc.provider}'."},
        )

    @app.exception_handler(ChatAccessDeniedError)
    async def chat_access_handler(request: Request, exc: ChatAccessDeniedError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN, content={"detail": exc.message}
        )
