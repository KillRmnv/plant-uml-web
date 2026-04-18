from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.app.infrastructure.db.database import get_db
from backend.app.presentation.api.dependencies import get_current_user
from backend.app.core.security import create_access_token
from backend.app.application.users import services, schemas
from backend.app.infrastructure.persistence.users_models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя."""
    logger.info(f"Register request: login={user_in.login}")
    result = await services.register_new_user(db=db, user_in=user_in)
    logger.info(f"User created: id={result.id}, login={result.login}")
    return result


@router.post("/login")
async def login_for_access_token(
    login_data: LoginRequest, db: AsyncSession = Depends(get_db)
):
    logger.info(f"Login request: username={login_data.username}")
    user = await services.authenticate_user(
        db, login=login_data.username, password=login_data.password
    )
    access_token = create_access_token(data={"sub": user.login})
    logger.info(f"User logged in: id={user.id}, login={user.login}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.login},
    }


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(
    current_user: User = Depends(get_current_user),
):
    """Получить текущего пользователя."""
    return current_user
