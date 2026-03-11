# Main - FastAPI entry point
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader

from config import (
    HOST,
    PORT,
    STATIC_PATH,
    TEMPLATES_PATH,
    CUSTOM_JS_PATH,
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

# Static files - /static/
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")
logger.info(f"Mounted static: {STATIC_PATH}")

# Custom JS - /custom/js/
app.mount("/custom/js", StaticFiles(directory=CUSTOM_JS_PATH), name="custom_js")
logger.info(f"Mounted custom js: {CUSTOM_JS_PATH}")

# Frontend - /app/
app.mount("/app", StaticFiles(directory=FRONTEND_PATH, html=True), name="frontend")
logger.info(f"Mounted frontend: {FRONTEND_PATH}")

# Jinja2 templates for sc-web
env = Environment(loader=FileSystemLoader(TEMPLATES_PATH))


@app.get("/", response_class=HTMLResponse)
async def main_page():
    """Main page - serve sc-web template"""
    template = env.get_template("base.html")
    html = template.render(
        has_entered=False, user=None, first_time="0", public_url=PUBLIC_URL
    )
    return html


@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "backend": "fastapi"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
