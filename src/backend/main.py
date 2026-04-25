# Main - FastAPI entry point
import logging
import os
from logging.handlers import RotatingFileHandler
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse

from backend.app.config import settings
from backend.app.integrations.deps import init_sc_client, disconnect
from backend.app.api.v1.api import router as api_v1_router

from backend.app.core.exception_handlers import setup_exception_handlers

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
log_file = os.getenv("LOG_FILE", "app.log")

logging.basicConfig(
    level=getattr(logging, log_level),
    handlers=[
        RotatingFileHandler(log_file, maxBytes=10_000_000, backupCount=3),
        logging.StreamHandler(),
    ],
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events - init/shutdown SC-client"""
    logger.info("Starting PlantUML Web Backend (FastAPI)...")
    logger.info(f"SC-Machine URL: {settings.public_url}")
    logger.info(f"Static path: {settings.static_path}")

    init_sc_client(
        server_url=settings.public_url,
        reconnect_retries=settings.reconnect_retries,
        reconnect_retry_delay=settings.reconnect_retry_delay,
        repo_file_path=str(settings.repo_file_path),
    )

    yield

    logger.info("Shutting down...")
    disconnect()


app = FastAPI(
    title="PlantUML Web Backend",
    description="Backend for PlantUML Web - SCg Editor",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def redirect_api_v1(request: Request, call_next):
    """Redirect /api/v1/* to /api/* for backward compatibility."""
    path = request.url.path
    if path.startswith("/api/v1"):
        new_path = path.replace("/api/v1", "/api", 1)
        request.scope["path"] = new_path
        request.scope["raw_path"] = new_path.encode()
    return await call_next(request)


setup_exception_handlers(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"]
    if settings.allowed_origins == "*"
    else settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API router (includes SC-web legacy at /api/v1/sc-web/...)
app.include_router(api_v1_router)


# ─────────────────────────────────────────────
# Frontend pages (must be before static mount)
# ─────────────────────────────────────────────


@app.get("/", response_class=HTMLResponse)
async def main_page():
    """Main page - serve login page"""
    with open(os.path.join(settings.frontend_path, "index.html"), "r") as f:
        return f.read()


@app.get("/app", response_class=HTMLResponse)
@app.get("/app/", response_class=HTMLResponse)
async def app_page():
    """Main app page - serve app.html"""
    with open(os.path.join(settings.frontend_path, "app.html"), "r") as f:
        return f.read()

@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "backend": "fastapi"}

# ─────────────────────────────────────────────
# Static files
# ─────────────────────────────────────────────

# /static/ (must be before catch-all /)
app.mount("/static", StaticFiles(directory=settings.static_path), name="static")
logger.info(f"Mounted static: {settings.static_path}")

# / (serves frontend files, must be last)
app.mount("/", StaticFiles(directory=settings.frontend_path), name="frontend")
logger.info(f"Mounted frontend: {settings.frontend_path}")





if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
