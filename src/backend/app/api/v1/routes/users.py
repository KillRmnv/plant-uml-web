from fastapi import APIRouter, Depends

from backend.app.api.dependencies import get_current_user
from backend.app.domains.users import schemas
from backend.app.domains.users.models import User

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse, summary="Получить свой профиль")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
