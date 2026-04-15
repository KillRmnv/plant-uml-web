from pydantic import BaseModel, Field, ConfigDict

class UserBase(BaseModel):
    login: str = Field(..., min_length=3, max_length=20)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)

class UserResponse(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)