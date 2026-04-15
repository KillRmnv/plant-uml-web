from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import logging

from app.domains.users.models import User
from app.domains.users.schemas import UserCreate
from app.core.security import get_password_hash

# Настраиваем логгер для отслеживания системных ошибок
logger = logging.getLogger(__name__)


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    """
    Безопасный поиск пользователя по логину. Возвращает None, если не найден.
    """
    stmt = select(User).where(User.login == login)
    result = await db.execute(stmt)
    # scalar_one_or_none() защищает от ошибки, если в БД случайно оказалось два одинаковых логина
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """
    Поиск пользователя по ID (используется в проверке токена).
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """
    Создание нового пользователя с безопасным хешированием пароля
    и обработкой конфликтов базы данных.
    """
    # 1. Хешируем пароль перед сохранением в БД
    hashed_password = get_password_hash(user_in.password)

    # 2. Создаем объект модели (пароль в чистом виде удаляется из памяти)
    db_user = User(
        login=user_in.login,
        password=hashed_password
    )

    db.add(db_user)

    try:
        # 3. Пытаемся сохранить в базу
        await db.commit()
        # 4. Обновляем объект, чтобы получить сгенерированный базой ID
        await db.refresh(db_user)
        return db_user

    except IntegrityError as e:
        # Если логин уже существует, база данных выкинет IntegrityError (из-за unique=True)
        # Мы перехватываем ошибку БД, откатываем сессию и отдаем красивую ошибку клиенту
        await db.rollback()
        logger.warning(f"Попытка регистрации с существующим логином: {user_in.login}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким логином уже существует."
        )
    except Exception as e:
        # Обработка непредвиденных ошибок (например, отвал базы данных)
        await db.rollback()
        logger.error(f"Ошибка БД при создании пользователя: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при создании пользователя."
        )