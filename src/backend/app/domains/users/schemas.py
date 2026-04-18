from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


class UserBase(BaseModel):
    login: str = Field(..., min_length=3, max_length=20, validation_alias="username")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str = Field(..., validation_alias="login")

    model_config = ConfigDict(from_attributes=True)


class UserApiKeysUpdate(BaseModel):
    provider: Literal["openai", "anthropic", "mistral", "openrouter", "localai"]
    api_key: str = Field(..., min_length=10)


class UserSettingsCreate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    auto_save: Optional[bool] = None  # None means "don't change"
    api_keys: Optional[dict] = (
        None  # {"openai": "sk-...", "anthropic": "...", "mistral": "..."}
    )


class UserSettingsResponse(BaseModel):
    id: int
    user_id: int
    provider: Optional[str] = None
    model: Optional[str] = None
    auto_save: Optional[bool] = True
    api_keys: dict = {}

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str
