from fastapi import FastAPI
from .routes.api import router

app = FastAPI(title="PlantUML Web SCg Editor API", version="1.0.0", root_path="/api/v1")

app.include_router(router)
