import logging
import base64

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.dependencies import get_current_user
from backend.app.domains.users.models import User
from backend.app.domains.diagram import schemas
from backend.app.core.agents import AgentChainExecutor
from backend.app.domains.diagram.exceptions import AgentExecutionError
from sc_client.client import generate_elements_by_scs
router = APIRouter(tags=["diagram"])
logger = logging.getLogger(__name__)
executor = AgentChainExecutor()
#TODO: add new endpoint responsible for generating diagram from scs and before that loading it into memmory
@router.post("/generate-from-inputs", response_model=schemas.DiagramGenerateResponse)
async def generate_diagram_from_inputs_route(
    request: schemas.DiagramFromInputsRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Принимает две строки (например, заголовок и код/контент),
    возвращает описание результата и PNG-изображение диаграммы в base64.

    Предназначен для генерации диаграмм по произвольным входным данным
    без предварительной загрузки в SC-память.
    """
    logger.info(
        "[diagram.route] user=%s endpoint=generate-from-inputs input1_len=%d input2_len=%d",
        current_user.login,
        len(request.structure_name),
        len(request.scs_code),
    )

    try:
        # Делегируем логику генерации в core.agents
        # Ожидаем: (описание_результата: str, image_base64: str)
        # 
        if not generate_elements_by_scs([request.scs_code])[0]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректный SCS-код",
            )
        plantuml_code, image_base64 = await executor.generate_diagram(request.structure_name)
    except AgentExecutionError as e:
        logger.error(
            "[diagram.route] AgentExecutionError user=%s detail=%s",
            current_user.login,
            str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка агента генерации: {str(e)}",
        )
    except ValueError as e:
        # Например, некорректный формат входных данных
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Некорректные входные данные: {str(e)}",
        )
    except Exception:
        logger.exception(
            "[diagram.route] unexpected error user=%s endpoint=generate-from-inputs",
            current_user.login,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка при генерации диаграммы.",
        )

    return schemas.DiagramGenerateResponse(
           plantuml_code=plantuml_code,
           image_base64=image_base64,
       )
    
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
        plantuml_code, image_base64 = await executor.generate_diagram(request.structure_name)
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