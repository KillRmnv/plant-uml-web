from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.infrastructure.db.database import get_db
from backend.app.presentation.api.dependencies import get_current_user
from backend.app.infrastructure.persistence.users_models import User
from backend.app.application.users import schemas

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse, summary="Получить свой профиль")
async def get_me(
    current_user: User = Depends(get_current_user),  # ← возвращает объект User
    db: AsyncSession = Depends(get_db),
):
    return current_user
