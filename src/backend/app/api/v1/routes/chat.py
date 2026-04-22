import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.database import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.chat import schemas, services
from backend.app.domains.chat.exceptions import (
    ChatAccessDeniedError,
    ChatNotFoundError,
)

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


@router.post("/consult")
async def consult_diagram(
    request: schemas.ChatConsultRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info(
        "[chat.consult] user=%s provider=%s model=%s mode=%s chat_id=%s diagram_code=%s chars",
        current_user.login,
        request.provider,
        request.model,
        request.mode,
        request.chat_id,
        len(request.diagram_code),
    )

    try:
        chat_id, response_generator = await services.process_chat_consultation(
            db=db,
            user=current_user,
            provider=request.provider,
            model=request.model,
            message_text=request.message,
            diagram_code=request.diagram_code,
            api_key=request.api_key,
            mode=request.mode,
            chat_id=request.chat_id,
        )
    except ChatAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату.",
        )
    except ChatNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден.",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "[chat.consult] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обработать запрос.",
        )

    headers = {"X-Chat-ID": str(chat_id)}
    return StreamingResponse(
        response_generator, media_type="text/event-stream", headers=headers
    )


@router.get("/chats", response_model=list[schemas.ChatResponse])
async def get_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await services.list_user_chats(db, current_user.id)
    except Exception:
        logger.exception(
            "[chat.get_chats] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить список чатов.",
        )


@router.post("/chats", response_model=schemas.ChatResponse)
async def create_chat(
    request: schemas.ChatCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await services.create_user_chat(db, current_user.id, request.title)
    except Exception:
        logger.exception(
            "[chat.create_chat] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось создать чат.",
        )


@router.get(
    "/chats/{chat_id}/messages", response_model=list[schemas.ChatMessageResponse]
)
async def get_chat_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await services.list_chat_messages(db, current_user.id, chat_id)
    except ChatAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату.",
        )
    except ChatNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден.",
        )
    except Exception:
        logger.exception(
            "[chat.get_messages] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить сообщения чата.",
        )


@router.delete("/chats/{chat_id}", response_model=schemas.ChatDeleteResponse)
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await services.delete_user_chat(db, current_user.id, chat_id)
    except ChatAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату.",
        )
    except ChatNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден.",
        )
    except Exception:
        logger.exception(
            "[chat.delete] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось удалить чат.",
        )
    return schemas.ChatDeleteResponse(success=True)


@router.put("/chats/{chat_id}", response_model=schemas.ChatResponse)
async def update_chat_title(
    chat_id: int,
    request: schemas.ChatUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await services.update_user_chat_title(
            db, current_user.id, chat_id, request.title
        )
    except ChatAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к чату.",
        )
    except ChatNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден.",
        )
    except Exception:
        logger.exception(
            "[chat.update] Unexpected error for user=%s", current_user.login
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обновить чат.",
        )
