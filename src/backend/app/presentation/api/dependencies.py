from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from backend.app.config import settings
from backend.app.infrastructure.db.database import get_db
from backend.app.infrastructure.persistence.users_models import User
from backend.app.application.users import services as users_services

# tokenUrl - это эндпоинт, на который Swagger UI будет отправлять логин/пароль
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        login: str = payload.get("sub")
        if login is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = await users_services.get_user_by_login(db, login=login)
    if user is None:
        raise credentials_exception
    return user
