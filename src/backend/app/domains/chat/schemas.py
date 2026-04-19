from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.app.integrations.llm.constants import SupportedProvider

ChatMode = Literal["assistant", "analyst"]


class ChatConsultRequest(BaseModel):
    provider: SupportedProvider
    model: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=2000)
    mode: ChatMode = Field(
        default="assistant",
        description="Режим чата: assistant для помощи с синтаксисом, analyst для анализа диаграммы",
    )
    diagram_code: str = Field(..., description="Код PlantUML для контекста")
    chat_id: Optional[int] = Field(default=None, description="ID существующего чата")


class ChatCreateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)


class ChatUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class ChatResponse(BaseModel):
    id: int
    title: str
    preview: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatDeleteResponse(BaseModel):
    success: bool
