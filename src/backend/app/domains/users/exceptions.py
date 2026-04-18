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


class SettingsDomainError(UserDomainError):
    """Базовый класс для ошибок подсистемы настроек/провайдеров."""
    pass


class APIKeyNotConfiguredError(SettingsDomainError):
    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(f"API key not configured for provider: {provider}")


class ProviderNotSupportedError(SettingsDomainError):
    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(f"Provider not supported: {provider}")


class AnthropicModelsNotSupportedError(SettingsDomainError):
    pass


class ProviderAPIError(SettingsDomainError):
    def __init__(self, provider: str, status_code: int):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"Provider API error {status_code} for {provider}")


class ProviderConnectionError(SettingsDomainError):
    def __init__(self, provider: str, message: str):
        self.provider = provider
        super().__init__(f"Connection error for {provider}: {message}")
