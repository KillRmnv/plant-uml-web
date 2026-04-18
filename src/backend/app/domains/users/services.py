import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security import get_password_hash, verify_password
from backend.app.domains.users import crud, schemas
from backend.app.domains.users.exceptions import InvalidCredentialsError
from backend.app.domains.users.models import User

logger = logging.getLogger(__name__)


async def register_new_user(db: AsyncSession, user_in: schemas.UserCreate) -> User:
    """Хеширует пароль и создаёт пользователя в БД."""
    logger.info(f"Attempting to register user: {user_in.login}")
    hashed_password = get_password_hash(user_in.password)
    user = await crud.create_user(
        db=db, login=user_in.login, hashed_password=hashed_password
    )
    logger.info(f"Successfully registered user: {user.login}, id={user.id}")
    return user


async def authenticate_user(db: AsyncSession, login: str, password: str) -> User:
    logger.info(f"Authenticating user: {login}")
    user = await crud.get_user_by_login(db, login)
    if not user or not verify_password(password, user.password):
        logger.warning(f"Invalid credentials for login: {login}")
        raise InvalidCredentialsError()
    logger.info(f"User authenticated successfully: {login}")
    return user
