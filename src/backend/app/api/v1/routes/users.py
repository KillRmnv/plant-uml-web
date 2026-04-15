"""User endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.domains.users import schemas, crud

router = APIRouter(prefix="/users", tags=["users"])

@router.post(
    "/register",
    response_model=schemas.UserResponse, # Строго фильтруем исходящие данные (без пароля!)
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя"
)
async def register_user(
    user_in: schemas.UserCreate, # FastAPI сам проверит длину пароля через Pydantic
    db: AsyncSession = Depends(get_db)
):
    """
    Создает нового пользователя в системе.
    Пароль будет надежно захеширован алгоритмом bcrypt.
    """
    # Вся сложная бизнес-логика и обработка ошибок инкапсулирована в crud.create_user
    user = await crud.create_user(db=db, user_in=user_in)
    return user