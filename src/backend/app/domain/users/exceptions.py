from backend.app.domain.chat.exceptions import APIKeyNotConfiguredError


class UserDomainError(Exception):
    """Базовый класс для всех ошибок домена users."""
    pass


class UserAlreadyExistsError(UserDomainError):
    def __init__(self, login: str):
        self.login = login
        self.message = f"Пользователь с логином '{login}' уже существует."
        super().__init__(self.message)


class UserNotFoundError(UserDomainError):
    def __init__(self, identifier: str | int):
        self.message = f"Пользователь '{identifier}' не найден."
        super().__init__(self.message)


class InvalidCredentialsError(UserDomainError):
    def __init__(self):
        self.message = "Неверный логин или пароль."
        super().__init__(self.message)


class ProviderNotSupportedError(UserDomainError):
    def __init__(self, provider: str):
        self.provider = provider
        self.message = f"Провайдер '{provider}' не поддерживается."
        super().__init__(self.message)


class ProviderModelsUnavailableError(UserDomainError):
    """Провайдер не предоставляет публичный API списка моделей."""

    def __init__(self, provider: str, detail: str | None = None):
        self.provider = provider
        self.message = detail or (
            f"Провайдер '{provider}' не поддерживает API списка моделей. "
            "Укажите модель вручную."
        )
        super().__init__(self.message)


class ProviderAPIError(UserDomainError):
    """Ошибка при обращении к внешнему API провайдера."""

    def __init__(self, provider: str, detail: str, status_code: int | None = None):
        self.provider = provider
        self.status_code = status_code
        self.message = detail
        super().__init__(self.message)


__all__ = [
    "UserDomainError",
    "UserAlreadyExistsError",
    "UserNotFoundError",
    "InvalidCredentialsError",
    "APIKeyNotConfiguredError",
    "ProviderNotSupportedError",
    "ProviderModelsUnavailableError",
    "ProviderAPIError",
]
