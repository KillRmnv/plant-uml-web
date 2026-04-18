from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.app.db.database import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.core.security import create_access_token
from backend.app.domains.users import services, schemas
from backend.app.domains.users.exceptions import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
)
from backend.app.domains.users.models import User
from backend.app.domains.users.schemas import LoginRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя."""
    logger.info(f"Register request: login={user_in.login}")
    try:
        result = await services.register_new_user(db=db, user_in=user_in)
    except UserAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    logger.info(f"User created: id={result.id}, login={result.login}")
    return result


@router.post("/login", response_model=schemas.LoginResponse)
async def login_for_access_token(
    login_data: LoginRequest, db: AsyncSession = Depends(get_db)
):
    logger.info(f"Login request: username={login_data.username}")
    try:
        user = await services.authenticate_user(
            db, login=login_data.username, password=login_data.password
        )
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.login})
    logger.info(f"User logged in: id={user.id}, login={user.login}")
    return schemas.LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserBrief.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Получить текущего пользователя."""
    return current_user
