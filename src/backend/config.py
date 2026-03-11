# Config - PlantUML Web Backend
import os
from os.path import abspath, dirname, join

# Base paths
BASE_DIR = dirname(abspath(__file__))
PROJECT_ROOT = dirname(dirname(BASE_DIR))

# SC-Web paths
SC_WEB_ROOT = os.environ.get("SC_WEB_ROOT", join(PROJECT_ROOT, "external/sc-web"))
TEMPLATES_PATH = join(BASE_DIR, "templates")
STATIC_PATH = join(SC_WEB_ROOT, "client/static")
CUSTOM_JS_PATH = join(PROJECT_ROOT, "custom/js")
FRONTEND_PATH = join(PROJECT_ROOT, "src/frontend")
REPO_FILE_PATH = join(SC_WEB_ROOT, "repo.path")

# Server config
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))

# SC-Machine
SERVER_HOST = os.environ.get("SC_SERVER_HOST", "localhost")
SERVER_PORT = int(os.environ.get("SC_SERVER_PORT", "8090"))
PUBLIC_URL = f"ws://{SERVER_HOST}:{SERVER_PORT}/ws_json"

# Timeouts
EVENT_WAIT_TIMEOUT = 10
ACTION_RESULT_WAIT_TIMEOUT = 2
IDTF_SEARCH_LIMIT = 100
RECONNECT_RETRIES = 5
RECONNECT_RETRY_DELAY = 2.0

# CORS
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
