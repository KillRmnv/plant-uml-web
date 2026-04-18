class ChatDomainError(Exception):
    """Базовый класс для всех ошибок домена chat."""
    pass


class ChatAccessDeniedError(ChatDomainError):
    def __init__(self, chat_id: int):
        self.chat_id = chat_id
        self.message = f"Чат {chat_id} не существует или у вас нет к нему доступа."
        super().__init__(self.message)
