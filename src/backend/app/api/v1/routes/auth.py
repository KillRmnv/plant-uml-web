from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.security import verify_password, create_access_token
from app.domains.users.crud import get_user_by_login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login_for_access_token(
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_db)
):
    # 1. Ищем пользователя по логину
    user = await get_user_by_login(db, login=form_data.username)

    # 2. Проверяем пароль (сравниваем чистый пароль из формы с хешем из БД)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Генерируем токен (в 'sub' кладем логин или id)
    access_token = create_access_token(data={"sub": user.login})

    # 4. Возвращаем токен по стандарту OAuth2
    return {"access_token": access_token, "token_type": "bearer"}