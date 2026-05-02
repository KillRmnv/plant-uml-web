"""
Глобальные фикстуры pytest для plant-uml-web.

Здесь:
- настраивается окружение (env-переменные SECRET_KEY, DATABASE_URL и т.д.);
- создаётся in-memory SQLite база для интеграционных тестов;
- мокируются внешние зависимости (sc-client, sc-machine, LLM-провайдеры);
- определяются вспомогательные фикстуры: AsyncClient, тестовый пользователь, JWT-токен.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import MagicMock, AsyncMock

import pytest
import pytest_asyncio


# ──────────────────────────────────────────────────────────────
# 1. ENV-переменные ДО импорта приложения
# ──────────────────────────────────────────────────────────────
os.environ.setdefault("SECRET_KEY", "test-secret-key-please-change-in-prod")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/test_plantuml_web",
)
os.environ.setdefault("LOG_LEVEL", "WARNING")
os.environ.setdefault("LOG_FILE", "/tmp/test-plantuml-web.log")

# StaticFiles в main.py монтирует каталог external/sc-web/client/static.
# Если репо клонировано без submodules — его нет. Создаём пустые фольдеры
# либо переопределяем SC_WEB_ROOT на временный каталог с нужной структурой.
import tempfile as _tempfile
if not os.environ.get("SC_WEB_ROOT"):
    _fake_sc_web = Path(_tempfile.mkdtemp(prefix="fake_sc_web_"))
    (_fake_sc_web / "client" / "static").mkdir(parents=True, exist_ok=True)
    (_fake_sc_web / "repo.path").write_text("")
    os.environ["SC_WEB_ROOT"] = str(_fake_sc_web)


# ──────────────────────────────────────────────────────────────
# 2. Гарантируем, что src/ есть в PYTHONPATH
# ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


# ──────────────────────────────────────────────────────────────
# 3. Подменяем sc_client/sc_kpm на безобидные заглушки,
#    чтобы main.py / agents.py / sc_session.py могли импортироваться
#    в окружении без установленного sc-machine.
# ──────────────────────────────────────────────────────────────
def _install_sc_stubs() -> None:
    import types

    # ── sc_client ─────────────────────────────────────────────
    sc_client = types.ModuleType("sc_client")
    sc_client_client = types.ModuleType("sc_client.client")
    sc_client_constants = types.ModuleType("sc_client.constants")
    sc_client_constants_exc = types.ModuleType("sc_client.constants.exceptions")
    sc_client_models = types.ModuleType("sc_client.models")
    sc_client_models_construction = types.ModuleType("sc_client.models.sc_construction")
    sc_client_keynodes = types.ModuleType("sc_client.sc_keynodes")

    class ScAddr:  # noqa: D401 - простая заглушка
        def __init__(self, value: int = 0):
            self.value = value

        def is_valid(self) -> bool:
            return self.value > 0

        def get(self, _idx):  # для совместимости с triple-результатами
            return ScAddr(0)

    class _ScType:
        CONST_NODE = "const_node"
        CONST_NODE_STRUCTURE = "const_node_structure"
        VAR_NODE_CLASS = "var_node_class"
        VAR_PERM_POS_ARC = "var_perm_pos_arc"
        CONST_PERM_POS_ARC = "const_perm_pos_arc"

        def __rshift__(self, _other):  # >> используется в шаблонах
            return self

    class ScConstruction:
        def __init__(self):
            self.elements: list = []

        def generate_node(self, *args, **kwargs):
            self.elements.append(("node", args, kwargs))

        def generate_connector(self, *args, **kwargs):
            self.elements.append(("connector", args, kwargs))

    class ScTemplate:
        def __init__(self):
            self.triples: list = []

        def triple(self, *args, **kwargs):
            self.triples.append((args, kwargs))
            return self

    class ScKeynodes:
        _instance = None

        def __new__(cls, *args, **kwargs):
            if cls._instance is None:
                cls._instance = super().__new__(cls)
            return cls._instance

        def __getitem__(self, _key):
            return ScAddr(1)

        @classmethod
        def resolve(cls, *_args, **_kwargs):
            return ScAddr(1)

        def resolve_identifiers(self, *_args, **_kwargs):
            return None

    class ServerError(Exception):
        pass

    class ScLinkContent:
        pass

    class ScLinkContentType:
        STRING = "string"

    class ScIdtfResolveParams(dict):
        pass

    class ScTemplateResult:
        def __init__(self, *_a, **_kw):
            pass

        def get(self, _alias):
            return ScAddr(0)

    ScLinkContentData = str  # type alias

    sc_client_client.connect = MagicMock()
    sc_client_client.disconnect = MagicMock()
    sc_client_client.set_error_handler = MagicMock()
    sc_client_client.set_reconnect_handler = MagicMock()
    sc_client_client.client = sc_client_client
    sc_client_client.search_by_template = MagicMock(return_value=[])
    sc_client_client.get_link_content = MagicMock(return_value=[])
    sc_client_client.generate_elements = MagicMock(return_value=[])
    sc_client_client.generate_elements_by_scs = MagicMock(return_value=[True])

    sc_client_constants.sc_type = _ScType()
    sc_client_constants_exc.ServerError = ServerError

    sc_client_models.ScAddr = ScAddr
    sc_client_models.ScConstruction = ScConstruction
    sc_client_models.ScTemplate = ScTemplate
    sc_client_models.ScLinkContent = ScLinkContent
    sc_client_models.ScLinkContentType = ScLinkContentType
    sc_client_models.ScIdtfResolveParams = ScIdtfResolveParams
    sc_client_models.ScTemplateResult = ScTemplateResult
    sc_client_models_construction.ScLinkContentData = ScLinkContentData

    sc_client_keynodes.ScKeynodes = ScKeynodes

    sc_client.client = sc_client_client
    sc_client.constants = sc_client_constants
    sc_client.models = sc_client_models
    sc_client.sc_keynodes = sc_client_keynodes

    sys.modules.setdefault("sc_client", sc_client)
    sys.modules.setdefault("sc_client.client", sc_client_client)
    sys.modules.setdefault("sc_client.constants", sc_client_constants)
    sys.modules.setdefault("sc_client.constants.exceptions", sc_client_constants_exc)
    sys.modules.setdefault("sc_client.models", sc_client_models)
    sys.modules.setdefault(
        "sc_client.models.sc_construction", sc_client_models_construction
    )
    sys.modules.setdefault("sc_client.sc_keynodes", sc_client_keynodes)

    # ── sc_kpm ─────────────────────────────────────────────────
    sc_kpm = types.ModuleType("sc_kpm")
    sc_kpm_utils = types.ModuleType("sc_kpm.utils")
    sc_kpm_identifiers = types.ModuleType("sc_kpm.identifiers")

    class _ScAlias:
        ELEMENT = "_element"
        ARC = "_arc"
        NODE = "_node"

    sc_kpm.ScKeynodes = ScKeynodes
    sc_kpm_identifiers.ScAlias = _ScAlias
    sc_kpm_utils.generate_connector = MagicMock(return_value=ScAddr(1))
    sc_kpm_utils.generate_node = MagicMock(return_value=ScAddr(1))
    sc_kpm_utils.get_element_system_identifier = MagicMock(return_value="some_idtf")
    sc_kpm_utils.get_link_content_data = MagicMock(return_value="")

    sys.modules.setdefault("sc_kpm", sc_kpm)
    sys.modules.setdefault("sc_kpm.utils", sc_kpm_utils)
    sys.modules.setdefault("sc_kpm.identifiers", sc_kpm_identifiers)


_install_sc_stubs()


# ──────────────────────────────────────────────────────────────
# 4. Фикстуры in-memory БД на SQLite
# ──────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def async_engine():
    """Создаёт чистый in-memory SQLite engine на каждый тест."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from backend.app.db.database import Base

    # Импортируем модели, чтобы они зарегистрировались в Base.metadata
    from backend.app.domains.users.models import User  # noqa: F401
    from backend.app.domains.chat.models import Chat, Message  # noqa: F401

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine) -> AsyncGenerator:
    """Готовая AsyncSession для тестов слоя crud/services."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

    factory = async_sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with factory() as session:
        yield session


# ──────────────────────────────────────────────────────────────
# 5. FastAPI: AsyncClient с переопределённой БД и stub'ами sc-client
# ──────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def app_with_test_db(async_engine, monkeypatch):
    """Создаёт экземпляр FastAPI с переопределённой БД и без подключения к sc-machine."""
    # Глушим init_sc_client, чтобы lifespan не пытался соединяться
    from backend.app.integrations import deps as deps_module

    monkeypatch.setattr(deps_module, "init_sc_client", lambda *a, **kw: None)
    monkeypatch.setattr(deps_module, "disconnect", lambda: None)

    from backend.main import app
    from backend.app.db.database import get_db
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

    factory = async_sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_get_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app_with_test_db):
    """httpx.AsyncClient с поднятым lifespan приложения."""
    from httpx import AsyncClient, ASGITransport
    from asgi_lifespan import LifespanManager

    async with LifespanManager(app_with_test_db):
        transport = ASGITransport(app=app_with_test_db)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as ac:
            yield ac


# ──────────────────────────────────────────────────────────────
# 6. Тестовые пользователи / токены
# ──────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def test_user(db_session):
    """Создаёт пользователя в тестовой БД и возвращает (user, plain_password)."""
    from backend.app.domains.users import services, schemas

    user_in = schemas.UserCreate(login="testuser", password="testpass123")
    user = await services.register_new_user(db_session, user_in)
    return user, "testpass123"


@pytest_asyncio.fixture
async def auth_headers(client):
    """Регистрирует пользователя через API и возвращает заголовок Authorization."""
    payload = {"username": "apiuser", "password": "apipass123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
