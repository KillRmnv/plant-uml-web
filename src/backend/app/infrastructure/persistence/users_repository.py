from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging

from backend.app.infrastructure.persistence.users_models import User
from backend.app.domain.users.exceptions import UserAlreadyExistsError

logger = logging.getLogger(__name__)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    logger.debug(f"Querying user by login: {login}")
    stmt = select(User).where(User.login == login)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    logger.debug(f"User query result for '{login}': {'Found' if user else 'Not found'}")
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    logger.debug(f"Querying user by id: {user_id}")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, login: str, hashed_password: str) -> User:
    """Только создает запись в БД, больше ничего."""
    logger.info(f"Creating user in DB: {login}")
    db_user = User(login=login, password=hashed_password)
    db.add(db_user)

    try:
        await db.commit()
        await db.refresh(db_user)
        logger.info(
            f"User created successfully: id={db_user.id}, login={db_user.login}"
        )
        return db_user
    except IntegrityError as e:
        await db.rollback()
        logger.warning(f"User already exists: {login}, error: {e}")
        raise UserAlreadyExistsError(login=login)
