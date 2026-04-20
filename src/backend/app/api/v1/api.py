"""Assembly of all v1 routers into a single APIRouter."""

from fastapi import APIRouter

router = APIRouter(prefix="/api")

# SC-web legacy compatibility (sc-machine session, commands, languages)
from backend.app.api.v1.routes.sc_web import router as sc_web_router

router.include_router(sc_web_router, prefix="/sc-web", tags=["sc-web"])

from backend.app.api.v1.routes.users import router as users_router

router.include_router(users_router, prefix="/users", tags=["users"])

from backend.app.api.v1.routes.auth import router as auth_router

router.include_router(auth_router, prefix="/auth", tags=["auth"])

from backend.app.api.v1.routes.chat import router as chat_router

router.include_router(chat_router, prefix="/chat", tags=["chat"])

from backend.app.api.v1.routes.settings import router as settings_router

router.include_router(settings_router, tags=["settings"])

from backend.app.api.v1.routes.diagram import router as diagram_router
router.include_router(diagram_router, prefix="/diagram", tags=["diagram"])
