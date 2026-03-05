from typing import List, Optional

from fastapi import APIRouter

from ..models.schemas import *

router = APIRouter()

# --- Auth ---
@router.post("/auth/register", response_model=RegisterResponse, status_code=201)
async def register(req: RegisterRequest):
    pass

@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    pass

@router.post("/auth/refresh", response_model=RefreshResponse)
async def refresh(req: RefreshRequest):
    pass

@router.post("/auth/logout", response_model=SuccessResponse)
async def logout(req: LogoutRequest):
    pass

@router.get("/auth/me", response_model=MeResponse)
async def get_me():
    pass

@router.patch("/auth/me", response_model=SuccessResponse)
async def patch_me(req: MePatchRequest):
    pass

@router.post("/auth/password/forgot", response_model=SuccessResponse)
async def forgot_password(req: ForgotPasswordRequest):
    pass

@router.post("/auth/password/reset", response_model=SuccessResponse)
async def reset_password(req: ResetPasswordRequest):
    pass

# --- Diagrams ---
@router.get("/diagrams/types", response_model=List[DiagramType])
async def get_diagram_types():
    pass

@router.post("/diagrams/generate", response_model=GenerateDiagramResponse)
async def generate_diagram(req: GenerateDiagramRequest):
    pass

# --- Converter ---
@router.post("/converter/scs-to-gwf", response_model=ScsToGwfResponse)
async def scs_to_gwf(req: ScsGwfRequest):
    pass

@router.post("/converter/gwf-to-scs", response_model=GwfToScsResponse)
async def gwf_to_scs(req: ScsGwfRequest):
    pass

@router.post("/converter/validate", response_model=ValidateResponse)
async def validate_content(req: ValidateRequest):
    pass

# --- PlantUML Render ---
@router.post("/plantuml/render", response_model=PlantUmlRenderResponse)
async def plantuml_render(req: PlantUmlRenderRequest):
    pass

# --- Assistant ---
@router.get("/assistant/chats", response_model=ChatsResponse)
async def get_chats(limit: int = 20, offset: int = 0):
    pass

@router.post("/assistant/chats", response_model=CreateChatResponse, status_code=201)
async def create_chat(req: CreateChatRequest):
    pass

@router.put("/assistant/chats/{chatId}", response_model=UpdateChatResponse)
async def update_chat(chatId: str, req: UpdateChatRequest):
    pass

@router.delete("/assistant/chats/{chatId}", response_model=SuccessResponse)
async def delete_chat(chatId: str):
    pass

@router.get("/assistant/chats/{chatId}/messages", response_model=MessagesResponse)
async def get_chat_messages(chatId: str, limit: int = 50, before: Optional[str] = None):
    pass

@router.post("/assistant/chats/{chatId}/messages", response_model=SendMessageResponse)
async def send_chat_message(chatId: str, req: SendMessageRequest):
    pass

@router.get("/assistant/providers", response_model=List[ProviderItem])
async def get_providers():
    pass

@router.get("/assistant/models", response_model=List[str])
async def get_models(provider: str):
    pass

# --- Settings ---
@router.get("/settings", response_model=SettingsData)
async def get_settings():
    pass

@router.put("/settings", response_model=SettingsUpdateResponse)
async def update_settings(req: SettingsData):
    pass

# --- Session ---
@router.put("/session", response_model=SessionSaveResponse)
async def save_session(req: SessionDataRequest):
    pass

@router.get("/session", response_model=SessionDataResponse)
async def get_session():
    pass

@router.delete("/session", response_model=SuccessResponse)
async def delete_session():
    pass

# --- Health Check ---
@router.get("/health", response_model=HealthResponse)
async def health_check():
    pass
