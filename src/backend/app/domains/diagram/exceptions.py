class DiagramDomainError(Exception):
    """Базовый класс ошибок домена diagram."""


class AgentExecutionError(DiagramDomainError):
    """Агент завершился с ошибкой или вернул пустой результат."""

    def __init__(self, reason: str = "Агент не вернул результат"):
        self.reason = reason
        super().__init__(reason)

