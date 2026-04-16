from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.database import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.users import schemas

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse, summary="Получить свой профиль")
async def get_me(
    current_user: User = Depends(get_current_user),  # ← возвращает объект User
    db: AsyncSession = Depends(get_db),
):
    return current_user
