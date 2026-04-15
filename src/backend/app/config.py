# Config - PlantUML Web Backend
import os
from os.path import abspath, dirname, join
from pathlib import Path
from pydantic import computed_field, Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    # SC-Web paths
    sc_web_root: Path = Field(default=PROJECT_ROOT / "external" / "sc-web")
    database_url: PostgresDsn
    @computed_field
    @property
    def static_path(self) -> Path:
        return self.sc_web_root / "client" / "static"

    @computed_field
    @property
    def repo_file_path(self) -> Path:
        return self.sc_web_root / "repo.path"

    @computed_field
    @property
    def frontend_path(self) -> Path:
        return PROJECT_ROOT / "src" / "frontend"

    host: str = "0.0.0.0"
    port: int = 8000

    # SC-Machine
    sc_server_host: str = "localhost"
    sc_server_port: int = 8090

    @computed_field
    @property
    def public_url(self) -> str:
        return f"ws://{self.sc_server_host}:{self.sc_server_port}/ws_json"

    # Timeouts
    event_wait_timeout: int = 10
    action_result_wait_timeout: int = 2
    idtf_search_limit: int = 100
    reconnect_retries: int = 5
    reconnect_retry_delay: float = 2.0

    # CORS
    allowed_origins: str | list[str] = "*"

    # JWT Settings
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expires: bool = False

settings = Settings()


# # Base paths
# BASE_DIR = dirname(abspath(__file__))
# PROJECT_ROOT = dirname(dirname(BASE_DIR))
#
# # SC-Web paths
# SC_WEB_ROOT = os.environ.get("SC_WEB_ROOT", join(PROJECT_ROOT, "external/sc-web"))
# STATIC_PATH = join(SC_WEB_ROOT, "client/static")
# FRONTEND_PATH = join(PROJECT_ROOT, "src/frontend")
# REPO_FILE_PATH = join(SC_WEB_ROOT, "repo.path")
#
# # Server config
# HOST = os.environ.get("HOST", "0.0.0.0")
# PORT = int(os.environ.get("PORT", "8000"))
#
# # SC-Machine
# SERVER_HOST = os.environ.get("SC_SERVER_HOST", "localhost")
# SERVER_PORT = int(os.environ.get("SC_SERVER_PORT", "8090"))
# PUBLIC_URL = f"ws://{SERVER_HOST}:{SERVER_PORT}/ws_json"
#
# # Timeouts
# EVENT_WAIT_TIMEOUT = 10
# ACTION_RESULT_WAIT_TIMEOUT = 2
# IDTF_SEARCH_LIMIT = 100
# RECONNECT_RETRIES = 5
# RECONNECT_RETRY_DELAY = 2.0
#
# # CORS
# ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
