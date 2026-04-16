from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.domains.users.models import User
from app.domains.chat import schemas, services

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/consult")
async def consult_diagram(
        request: schemas.ChatConsultRequest,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
):

    # Вся оркестрация делегирована сервисному слою
    chat_id, response_generator = await services.process_chat_consultation(
        db=db,
        user=current_user,
        provider=request.provider,
        message_text=request.message,
        diagram_code=request.diagram_code,
        chat_id=request.chat_id
    )

    # Роутер занимается только HTTP-специфичными вещами
    headers = {"X-Chat-ID": str(chat_id)}

    return StreamingResponse(
        response_generator,
        media_type="text/event-stream",
        headers=headers
    )
