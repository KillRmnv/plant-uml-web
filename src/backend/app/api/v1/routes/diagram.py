import logging

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.diagram import schemas
from backend.app.core.agents import generate_diagram
from backend.app.domains.diagram.exceptions import AgentExecutionError

router = APIRouter(tags=["diagram"])
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=schemas.DiagramGenerateResponse)
async def generate_diagram_route(
    request: schemas.DiagramGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
        Принимает название структуры, возвращает PlantUML-код и PNG в base64.

        Генерация делегируется ostis-агентам (core/agents.py).
        """
    logger.info(
        "[diagram.route] user=%s structure_name=%r",
        current_user.login,
        request.structure_name,
    )
    try:
        plantuml_code, image_base64 = await generate_diagram(request.structure_name)
    except AgentExecutionError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception:
        logger.exception("[diagram.route] unexpected error user=%s", current_user.login)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сгенерировать диаграмму.",
        )

    return schemas.DiagramGenerateResponse(
        plantuml_code=plantuml_code,
        image_base64=image_base64,
    )