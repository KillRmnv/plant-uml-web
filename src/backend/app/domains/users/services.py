from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.domains.users import crud, schemas
from app.domains.users.models import User
from app.core.security import get_password_hash
from app.core.exceptions import UserNotFoundError

logger = logging.getLogger(__name__)


async def register_new_user(db: AsyncSession, user_in: schemas.UserCreate) -> User:
    """
    Бизнес-логика регистрации пользователя.
    1. Хеширует пароль.
    2. Вызывает слой БД для сохранения.
    3. (Здесь в будущем можно добавить отправку email или создание дефолтных настроек).
    """
    logger.info(f"Регистрация нового пользователя: {user_in.login}")

    hashed_password = get_password_hash(user_in.password)
    user = await crud.create_user(db=db, login=user_in.login, hashed_password=hashed_password)

    return user


async def get_user_profile(db: AsyncSession, user_id: int) -> User:
    """Получение профиля с проверкой существования."""
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundError(user_id)
    return user