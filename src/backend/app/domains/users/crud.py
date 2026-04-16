from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging

from app.domains.users.models import User
from app.domains.users.exceptions import UserAlreadyExistsError

logger = logging.getLogger(__name__)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    stmt = select(User).where(User.login == login)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, login: str, hashed_password: str) -> User:
    """Только создает запись в БД, больше ничего."""
    db_user = User(login=login, password=hashed_password)
    db.add(db_user)

    try:
        await db.commit()
        await db.refresh(db_user)
        return db_user
    except IntegrityError:
        # Перехватываем ошибку БД и кидаем нашу доменную ошибку
        await db.rollback()
        raise UserAlreadyExistsError(login=login)