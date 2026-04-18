from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.app.infrastructure.persistence import users_repository as crud
from backend.app.application.users import schemas
from backend.app.domain.users.entities import User
from backend.app.core.security import get_password_hash, verify_password
from backend.app.domain.users.exceptions import (
    UserNotFoundError,
    InvalidCredentialsError,
)

logger = logging.getLogger(__name__)


async def register_new_user(db: AsyncSession, user_in: schemas.UserCreate) -> User:
    """
    Бизнес-логика регистрации пользователя.
    1. Хеширует пароль.
    2. Вызывает слой БД для сохранения.
    3. (Здесь в будущем можно добавить отправку email или создание дефолтных настроек).
    """
    logger.info(f"Attempting to register user: {user_in.login}")

    hashed_password = get_password_hash(user_in.password)
    user = await crud.create_user(
        db=db, login=user_in.login, hashed_password=hashed_password
    )

    logger.info(f"Successfully registered user: {user.login}, id={user.id}")
    return user


async def get_user_profile(db: AsyncSession, user_id: int) -> User:
    """Получение профиля с проверкой существования."""
    logger.info(f"Fetching user profile: id={user_id}")
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        logger.warning(f"User not found: id={user_id}")
        raise UserNotFoundError(user_id)
    logger.info(f"User profile retrieved: {user.login}")
    return user


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    """Тонкая обёртка над репозиторием для слоёв, которым нужен пользователь по логину."""
    return await crud.get_user_by_login(db, login)


async def authenticate_user(db: AsyncSession, login: str, password: str) -> User:
    logger.info(f"Authenticating user: {login}")
    user = await crud.get_user_by_login(db, login)
    if not user:
        logger.warning(f"User not found during auth: {login}")
        raise InvalidCredentialsError()
    if not verify_password(password, user.password):
        logger.warning(f"Invalid password for user: {login}")
        raise InvalidCredentialsError()
    logger.info(f"User authenticated successfully: {login}")
    return user
