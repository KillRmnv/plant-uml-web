from pydantic import BaseModel, Field
from typing import Literal, Optional

class ChatConsultRequest(BaseModel):
    provider: Literal["openai", "anthropic", "mistral"]
    message: str = Field(..., min_length=1, max_length=2000)
    diagram_code: str = Field(..., description="Код PlantUML для контекста")
    # Если chat_id = None, бэкенд создаст новый чат
    chat_id: Optional[int] = Field(default=None, description="ID существующего чата")