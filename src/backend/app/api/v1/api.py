"""Assembly of all v1 routers into a single APIRouter."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

# SC-web legacy compatibility (sc-machine session, commands, languages)
from backend.app.api.v1.routes.sc_web import router as sc_web_router
router.include_router(sc_web_router, prefix="/sc-web", tags=["sc-web"])

# User management
# from backend.app.api.v1.routes.users import router as users_router
# router.include_router(users_router, prefix="/users", tags=["users"])


