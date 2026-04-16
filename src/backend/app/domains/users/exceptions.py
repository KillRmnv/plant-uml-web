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