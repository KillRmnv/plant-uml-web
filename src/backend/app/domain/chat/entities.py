"""Чистые доменные сущности чата.

Не зависят от SQLAlchemy или любой инфраструктуры.
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Message:
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime | None = None


@dataclass
class Chat:
    id: int
    user_id: int
    title: str = "Новый анализ"
    created_at: datetime | None = None
    preview: str = ""
    messages: list[Message] = field(default_factory=list)
