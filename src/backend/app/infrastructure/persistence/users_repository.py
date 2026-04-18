"""SQLAlchemy-реализация репозитория пользователей.

Публичные функции возвращают доменные сущности из
``domain/users/entities.py`` — ORM-объекты не утекают за пределы этого
модуля.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging

from backend.app.infrastructure.persistence.users_models import User as UserORM
from backend.app.domain.users.entities import User
from backend.app.domain.users.exceptions import UserAlreadyExistsError
from backend.app.domain.users.interfaces import IUserRepository

logger = logging.getLogger(__name__)


def _to_domain(orm: UserORM | None) -> User | None:
    if orm is None:
        return None
    return User(id=orm.id, login=orm.login, password=orm.password)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    logger.debug(f"Querying user by login: {login}")
    stmt = select(UserORM).where(UserORM.login == login)
    result = await db.execute(stmt)
    orm = result.scalar_one_or_none()
    logger.debug(f"User query result for '{login}': {'Found' if orm else 'Not found'}")
    return _to_domain(orm)


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    logger.debug(f"Querying user by id: {user_id}")
    stmt = select(UserORM).where(UserORM.id == user_id)
    result = await db.execute(stmt)
    return _to_domain(result.scalar_one_or_none())


async def create_user(db: AsyncSession, login: str, hashed_password: str) -> User:
    """Создаёт запись пользователя и возвращает доменную сущность."""
    logger.info(f"Creating user in DB: {login}")
    db_user = UserORM(login=login, password=hashed_password)
    db.add(db_user)

    try:
        await db.commit()
        await db.refresh(db_user)
        logger.info(
            f"User created successfully: id={db_user.id}, login={db_user.login}"
        )
        domain = _to_domain(db_user)
        assert domain is not None
        return domain
    except IntegrityError as e:
        await db.rollback()
        logger.warning(f"User already exists: {login}, error: {e}")
        raise UserAlreadyExistsError(login=login)


class SqlAlchemyUserRepository(IUserRepository):
    """Объектный фасад — реализует IUserRepository поверх функционального API."""

    def __init__(self, db: AsyncSession):
        self._db = db

    async def get_by_login(self, login: str) -> User | None:
        return await get_user_by_login(self._db, login)

    async def get_by_id(self, user_id: int) -> User | None:
        return await get_user_by_id(self._db, user_id)

    async def create(self, login: str, hashed_password: str) -> User:
        return await create_user(self._db, login, hashed_password)
