from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

# --- Auth Models ---
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8)
    email: EmailStr

class RegisterResponse(BaseModel):
    user_id: str
    username: str
    created_at: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class UserData(BaseModel):
    user_id: str
    username: str
    email: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: UserData

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int

class LogoutRequest(BaseModel):
    refresh_token: str

class SuccessResponse(BaseModel):
    success: bool

class MeResponse(BaseModel):
    user_id: str
    username: str
    email: str
    created_at: datetime

class MePatchRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

# --- Diagrams Models ---
class DiagramType(BaseModel):
    id: str
    label: str

class GenerateDiagramRequest(BaseModel):
    node_id: str
    type: str
    format: str = "png"

class GenerateDiagramResponse(BaseModel):
    plantuml_code: str
    image: str
    format: str
    generated_at: datetime

# --- Converter Models ---
class ScsGwfRequest(BaseModel):
    content: str

class ScsToGwfResponse(BaseModel):
    gwf: str

class GwfToScsResponse(BaseModel):
    scs: str

class ValidateRequest(BaseModel):
    content: str
    type: str

class ValidateResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]

# --- PlantUML Render Models ---
class PlantUmlRenderRequest(BaseModel):
    content: str
    input_format: str
    output_format: str = "png"

class PlantUmlRenderResponse(BaseModel):
    plantuml_code: str
    image: str
    format: str

# --- Assistant Models ---
class ChatItem(BaseModel):
    id: str
    title: str
    preview: str
    message_count: int
    created_at: datetime
    updated_at: datetime

class ChatsResponse(BaseModel):
    total: int
    items: List[ChatItem]

class CreateChatRequest(BaseModel):
    title: str

class CreateChatResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

class UpdateChatRequest(BaseModel):
    title: str

class UpdateChatResponse(BaseModel):
    id: str
    title: str

class MessageItem(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime

class MessagesResponse(BaseModel):
    has_more: bool
    items: List[MessageItem]

class SendMessageRequest(BaseModel):
    message: str
    mode: str = "assistant"

class SendMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    mode: str
    timestamp: datetime

class ProviderItem(BaseModel):
    id: str
    name: str
    available: bool

# --- Settings Models ---
class SettingsData(BaseModel):
    provider: str
    model: str
    api_key: str
    auto_save: bool
    render_format: str
    theme: str

class SettingsUpdateResponse(BaseModel):
    success: bool
    updated_at: datetime

# --- Session Models ---
class SessionDataRequest(BaseModel):
    editor_type: str
    editor_content: str

class SessionSaveResponse(BaseModel):
    success: bool
    session_id: str

class SessionDataResponse(BaseModel):
    editor_type: str
    editor_content: str
    saved_at: datetime

# --- Health Check Models ---
class HealthServices(BaseModel):
    database: str
    sc_machine: str
    plantuml: str

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: HealthServices
