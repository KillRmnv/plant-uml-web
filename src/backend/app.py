"""
SCg Editor Backend

TODO:
1. Добавить WebSocket эндпоинт для real-time коммуникации с фронтендом
2. Реализовать авторизацию и аутентификацию пользователей
3. Добавить сохранение/загрузку графов в БД
4. Реализовать обработку ошибок и логирование
5. Добавить валидацию входящих данных
6. Настроить CORS для фронтенда
7. Добавить rate limiting
8. Настроить docker-compose для sc-machine
"""

import os
import asyncio
import logging
from threading import Thread, Event
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS  # TODO: pip install flask-cors

# Импорты из OSTIS
from py_sc_client import ScClient
from py_sc_client.constants import sc_type
from py_sc_kpm import ScKPM

# Импорты дополнительных эндпоинтов
from api_endpoints import register_additional_endpoints

# =============================================================================
# КОНФИГУРАЦИЯ
# =============================================================================

# Настройка логирования
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Регистрация дополнительных эндпоинтов
register_additional_endpoints(app)

# TODO: Раскомментировать для поддержки CORS
# CORS(app)

# Конфигурация из переменных окружения
SC_SERVER_URL = os.getenv("SC_SERVER_URL", "ws://localhost:8090/ws_json")
DEBUG_MODE = os.getenv("DEBUG", "True").lower() == "true"

# =============================================================================
# SC-CLIENT WRAPPER
# =============================================================================


class ScClientWrapper:
    """
    Обертка над py-sc-client для Flask

    Запускает WebSocket клиент в отдельном потоке, чтобы не блокировать Flask
    """

    def __init__(self, server_url: str):
        self.server_url = server_url
        self.client = None
        self.kpm = None
        self.loop = None
        self.thread = None
        self.ready_event = Event()

    def start(self):
        """Запуск WebSocket клиента в фоновом потоке"""
        logger.info(f"[ScClient] Подключение к {self.server_url}...")
        self.thread = Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        self.ready_event.wait()
        logger.info("[ScClient] Подключение установлено")

    def _run_loop(self):
        """Запуск event loop в фоновом потоке"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        self.client = ScClient()
        self.kpm = ScKPM(self.client)

        try:
            self.loop.run_until_complete(self.client.connect(self.server_url))
        except Exception as e:
            logger.error(f"[ScClient] Ошибка подключения: {e}")
            return

        self.ready_event.set()
        self.loop.run_forever()

    # -------------------------------------------------------------------------
    # Методы для работы с графом
    # -------------------------------------------------------------------------

    def create_node(self, node_type: int, idtf: str = None):
        """Создание узла"""
        logger.info(f"[ScClient] Создание узла: type={node_type}, idtf={idtf}")

        async def _create():
            return await self.client.create_node(sc_type(node_type), idtf)

        return self.loop.run_until_complete(_create())

    def create_edge(self, edge_type: int, source, target):
        """Создание дуги"""
        logger.info(f"[ScClient] Создание дуги: type={edge_type}, {source} -> {target}")

        async def _create():
            return await self.client.create_edge(sc_type(edge_type), source, target)

        return self.loop.run_until_complete(_create())

    def create_link(self, content: str, content_type: str = "format_txt"):
        """Создание sc-link"""
        logger.info(f"[ScClient] Создание link: {content[:50]}...")

        async def _create():
            return await self.client.create_link(content, content_type)

        return self.loop.run_until_complete(_create())

    def resolve_keynodes(self, identifiers: list):
        """Резолвинг ключевых узлов"""
        logger.info(f"[ScClient] Резолвинг: {identifiers}")

        async def _resolve():
            return await self.client.resolve_keynodes(identifiers)

        return self.loop.run_until_complete(_resolve())

    def get_element(self, addr):
        """Получение элемента по адресу"""

        async def _get():
            return await self.client.get_element(addr)

        return self.loop.run_until_complete(_get())

    def get_elements_types(self, addrs):
        """Получение типов элементов"""

        async def _get():
            return await self.client.get_elements_types(addrs)

        return self.loop.run_until_complete(_get())

    def search_by_template(self, template):
        """Поиск по шаблону"""
        logger.info(f"[ScClient] Поиск по шаблону")

        async def _search():
            return await self.client.search_by_template(template)

        return self.loop.run_until_complete(_search())

    def search_similar_by_template(self, pattern):
        """Поиск похожих конструкций через KPM"""
        logger.info(f"[ScClient] Поиск похожих конструкций")

        async def _search():
            return await self.kpm.search_similar_by_template(pattern)

        return self.loop.run_until_complete(_search())

    def generate_scs_code(self, construction):
        """Генерация SCs кода через KPM"""
        logger.info(f"[ScClient] Генерация SCs кода")

        async def _generate():
            return await self.kpm.generate_scs_code(construction)

        return self.loop.run_until_complete(_generate())

    # -------------------------------------------------------------------------
    # Управление
    # -------------------------------------------------------------------------

    def close(self):
        """Закрытие соединения"""
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)


# =============================================================================
# ИНИЦИАЛИЗАЦИЯ
# =============================================================================

# Инициализация WebSocket клиента
logger.info("[App] Инициализация...")
sc_wrapper = ScClientWrapper(SC_SERVER_URL)

with app.app_context():
    sc_wrapper.start()


# =============================================================================
# API ENDPOINTS - Граф
# =============================================================================


@app.route("/")
def index():
    """Главная страница"""
    return send_from_directory("../static", "index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Проверка здоровья приложения"""
    return jsonify({"status": "ok", "sc_connected": sc_wrapper.client is not None})


@app.route("/api/node/create", methods=["POST"])
def create_node():
    """
    Создание узла

    Тело запроса:
    {
        "type": 1,           # Тип узла (sc_type)
        "idtf": "node_1",   # Идентификатор (опционально)
    }
    """
    # TODO: Валидация данных
    data = request.json
    node_type = data.get("type", sc_type.NODE)
    idtf = data.get("idtf", None)

    try:
        result = sc_wrapper.create_node(node_type, idtf)
        return jsonify({"status": "ok", "addr": str(result)})
    except Exception as e:
        logger.error(f"[API] Ошибка создания узла: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/edge/create", methods=["POST"])
def create_edge():
    """
    Создание дуги

    Тело запроса:
    {
        "type": 32,              # Тип дуги (sc_type)
        "source": "0x1",         # Адрес начала
        "target": "0x2",         # Адрес конца
    }
    """
    data = request.json
    edge_type = data.get("type", sc_type.ARC_COMMON)
    source = data.get("source")
    target = data.get("target")

    try:
        result = sc_wrapper.create_edge(edge_type, source, target)
        return jsonify({"status": "ok", "addr": str(result)})
    except Exception as e:
        logger.error(f"[API] Ошибка создания дуги: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/link/create", methods=["POST"])
def create_link():
    """
    Создание sc-link

    Тело запроса:
    {
        "content": "Текст ссылки",
        "content_type": "format_txt"  # или "format_html", "format_pdf" и т.д.
    }
    """
    data = request.json
    content = data.get("content", "")
    content_type = data.get("content_type", "format_txt")

    try:
        result = sc_wrapper.create_link(content, content_type)
        return jsonify({"status": "ok", "addr": str(result)})
    except Exception as e:
        logger.error(f"[API] Ошибка создания link: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# =============================================================================
# API ENDPOINTS - Поиск и резолвинг
# =============================================================================


@app.route("/api/keynodes/resolve", methods=["POST"])
def resolve_keynodes():
    """
    Резолвинг идентификаторов в sc-адреса

    Тело запроса:
    {
        "identifiers": ["nrel_main_idtf", "ui_start_sc_element"]
    }
    """
    data = request.json
    identifiers = data.get("identifiers", [])

    try:
        result = sc_wrapper.resolve_keynodes(identifiers)
        return jsonify(result)
    except Exception as e:
        logger.error(f"[API] Ошибка резолвинга: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/template/search", methods=["POST"])
def search_template():
    """
    Поиск по шаблону

    Тело запроса:
    {
        "template": {...}
    }
    """
    data = request.json
    template = data.get("template")

    try:
        result = sc_wrapper.search_by_template(template)
        return jsonify({"status": "ok", "result": str(result)})
    except Exception as e:
        logger.error(f"[API] Ошибка поиска: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/kpm/search_similar", methods=["POST"])
def kpm_search_similar():
    """
    Поиск похожих конструкций через KPM
    """
    data = request.json
    pattern = data.get("pattern")

    try:
        result = sc_wrapper.search_similar_by_template(pattern)
        return jsonify({"status": "ok", "result": str(result)})
    except Exception as e:
        logger.error(f"[API] Ошибка KPM поиска: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/kpm/generate_scs", methods=["POST"])
def kpm_generate_scs():
    """
    Генерация SCs кода через KPM
    """
    data = request.json
    construction = data.get("construction")

    try:
        result = sc_wrapper.generate_scs_code(construction)
        return jsonify({"status": "ok", "result": result})
    except Exception as e:
        logger.error(f"[API] Ошибка генерации SCs: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# =============================================================================
# API ENDPOINTS - Управление графом (TODO)
# =============================================================================

# TODO: Эндпоинты для сохранения/загрузки графов
# @app.route("/api/graph/save", methods=["POST"])
# def save_graph():
#     """
#     Сохранение графа
#
#     Тело запроса:
#     {
#         "name": "my_graph",
#         "data": {...}  # Данные графа из SCg Editor
#     }
#     """
#     pass

# TODO: Эндпоинт для получения списка сохраненных графов
# @app.route("/api/graph/list", methods=["GET"])
# def list_graphs():
#     pass

# TODO: Эндпоинт для загрузки графа
# @app.route("/api/graph/load/<graph_id>", methods=["GET"])
# def load_graph(graph_id):
#     pass

# TODO: Эндпоинт для удаления графа
# @app.route("/api/graph/delete/<graph_id>", methods=["DELETE"])
# def delete_graph(graph_id):
#     pass


# =============================================================================
# STATIC FILES
# =============================================================================


@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("../static", filename)


# =============================================================================
# ЗАПУСК
# =============================================================================

if __name__ == "__main__":
    logger.info(f"[App] Запуск на http://0.0.0.0:5000")
    logger.info(f"[App] Debug mode: {DEBUG_MODE}")
    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE)
