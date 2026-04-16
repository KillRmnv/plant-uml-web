from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.domains.users import schemas, services

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
    # Внимание: здесь нужно использовать вашу зависимость get_current_user 
    # из app.api.dependencies, которая достает токен
    current_user_id: int = Depends(get_current_user_id), 
    db: AsyncSession = Depends(get_db)
):
    return await services.get_user_profile(db=db, user_id=current_user_id)