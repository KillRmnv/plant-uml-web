
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from app.core.config import settings
from app.db.database import get_db
# Импортируйте ваши модели и запросы (CRUD) к пользователям
from app.domains.users import models
from app.domains.users.crud import get_user_by_login

# tokenUrl - это эндпоинт, на который Swagger UI будет отправлять логин/пароль
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Расшифровываем токен
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        login: str = payload.get("sub")
        if login is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # Ищем пользователя в БД (эту функцию нужно будет написать в app/domains/users/crud.py)
    user = await get_user_by_login(db, login=login)
    if user is None:
        raise credentials_exception
    return user