class ChatDomainError(Exception):
    """Базовый класс для всех ошибок домена chat."""
    pass

class APIKeyNotConfiguredError(ChatDomainError):
    def __init__(self, provider: str):
        self.provider = provider
        self.message = f"API ключ для провайдера '{provider}' не настроен в вашем профиле."
        super().__init__(self.message)

class ChatAccessDeniedError(ChatDomainError):
    def __init__(self, chat_id: int):
        self.message = f"Чат {chat_id} не существует или у вас нет к нему доступа."
        super().__init__(self.message)

class LLMProviderError(ChatDomainError):
    def __init__(self, provider: str, detail: str):
        self.message = f"Ошибка ответа от {provider}: {detail}"
        super().__init__(self.message)