from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    login: str = Field(..., min_length=3, max_length=20, validation_alias="username")

    model_config = ConfigDict(populate_by_name=True)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)
    email: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str = Field(..., validation_alias="login")

    model_config = ConfigDict(from_attributes=True)


class UserSettingsCreate(BaseModel):
    """Partial-update payload for user settings. Fields set to None are ignored."""

    provider: Optional[str] = None
    model: Optional[str] = None
    auto_save: Optional[bool] = None
    api_keys: Optional[dict[str, str]] = None


class UserSettingsResponse(BaseModel):
    id: int
    user_id: int
    provider: Optional[str] = None
    model: Optional[str] = None
    auto_save: Optional[bool] = True
    api_keys: dict = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


UserBrief = UserResponse


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
