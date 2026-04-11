# Main - FastAPI entry point
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from backend.app.config import settings
from backend.app.integrations.deps import init_sc_client, disconnect
from router import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events"""
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.allowed_origins == "*" else settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(router)


# Routes for HTML pages (must be before static mount)
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


# Static files - /static/ (must be before catch-all /)
app.mount("/static", StaticFiles(directory=settings.static_path), name="static")
logger.info(f"Mounted static: {settings.static_path}")

# Static files - / (serves frontend files, must be last)
app.mount("/", StaticFiles(directory=settings.frontend_path), name="frontend")
logger.info(f"Mounted frontend: {settings.frontend_path}")


@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "backend": "fastapi"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
