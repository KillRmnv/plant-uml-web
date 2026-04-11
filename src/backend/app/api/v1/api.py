"""Assembly of all v1 routers into a single APIRouter."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

# TODO: Include routers from routes/
# router.include_router(users.router, prefix="/users", tags=["users"])
# router.include_router(commands.router, prefix="/commands", tags=["commands"])
# router.include_router(languages.router, prefix="/languages", tags=["languages"])
