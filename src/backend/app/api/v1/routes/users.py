from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.domains.users import schemas, services
from app.api.dependencies import get_current_user
from app.domains.users.models import User
router = APIRouter()

@router.post(
    "/register", 
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя"
)
async def register(
    user_in: schemas.UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Роутер просто вызывает сервис."""
    return await services.register_new_user(db=db, user_in=user_in)

@router.get(
    "/me", 
    response_model=schemas.UserResponse,
    summary="Получить свой профиль"
)

async def get_me(
    current_user: User = Depends(get_current_user),  # ← возвращает объект User
    db: AsyncSession = Depends(get_db)
):
    return current_user