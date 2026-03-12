# Main - FastAPI entry point
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from config import (
    HOST,
    PORT,
    STATIC_PATH,
    FRONTEND_PATH,
    PUBLIC_URL,
    REPO_FILE_PATH,
    RECONNECT_RETRIES,
    RECONNECT_RETRY_DELAY,
    ALLOWED_ORIGINS,
)
from deps import init_sc_client, disconnect
from router import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events"""
    logger.info("Starting PlantUML Web Backend (FastAPI)...")
    logger.info(f"SC-Machine URL: {PUBLIC_URL}")
    logger.info(f"Static path: {STATIC_PATH}")

    init_sc_client(
        server_url=PUBLIC_URL,
        reconnect_retries=RECONNECT_RETRIES,
        reconnect_retry_delay=RECONNECT_RETRY_DELAY,
        repo_file_path=str(REPO_FILE_PATH),
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
    allow_origins=["*"] if ALLOWED_ORIGINS == "*" else ALLOWED_ORIGINS.split(","),
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
    with open(os.path.join(FRONTEND_PATH, "index.html"), "r") as f:
        return f.read()


@app.get("/app", response_class=HTMLResponse)
@app.get("/app/", response_class=HTMLResponse)
async def app_page():
    """Main app page - serve app.html"""
    with open(os.path.join(FRONTEND_PATH, "app.html"), "r") as f:
        return f.read()


# Static files - / (serves frontend files, must be last)
app.mount("/", StaticFiles(directory=FRONTEND_PATH), name="frontend")
logger.info(f"Mounted frontend: {FRONTEND_PATH}")

# Static files - /static/
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")
logger.info(f"Mounted static: {STATIC_PATH}")


@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "backend": "fastapi"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
