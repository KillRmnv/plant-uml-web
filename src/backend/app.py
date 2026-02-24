# -*- coding: utf-8 -*-

import os
import asyncio
from threading import Thread, Event
from flask import Flask, jsonify, request, send_from_directory
from py_sc_client import ScClient
from py_sc_client.constants import sc_type
from py_sc_kpm import ScKPM

app = Flask(__name__)

# Конфигурация
SC_SERVER_URL = os.getenv("SC_SERVER_URL", "ws://localhost:8090/ws_json")


class ScClientWrapper:
    """Обертка над py-sc-client для Flask"""

    def __init__(self, server_url: str):
        self.server_url = server_url
        self.client = None
        self.kpm = None
        self.loop = None
        self.thread = None
        self.ready_event = Event()

    def start(self):
        """Запуск WebSocket клиента в фоновом потоке"""
        self.thread = Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        self.ready_event.wait()

    def _run_loop(self):
        """Запуск event loop в фоновом потоке"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        self.client = ScClient()
        self.kpm = ScKPM(self.client)

        try:
            self.loop.run_until_complete(self.client.connect(self.server_url))
        except Exception as e:
            print(f"Connection error: {e}")
            return

        self.ready_event.set()
        self.loop.run_forever()

    def create_node(self, node_type: int, idtf: str = None):
        """Создание узла"""

        async def _create():
            return await self.client.create_node(sc_type(node_type), idtf)

        return self.loop.run_until_complete(_create())

    def create_edge(self, edge_type: int, source, target):
        """Создание дуги"""

        async def _create():
            return await self.client.create_edge(sc_type(edge_type), source, target)

        return self.loop.run_until_complete(_create())

    def resolve_keynodes(self, identifiers: list):
        """Резолвинг ключевых узлов"""

        async def _resolve():
            return await self.client.resolve_keynodes(identifiers)

        return self.loop.run_until_complete(_resolve())

    def search_by_template(self, template):
        """Поиск по шаблону"""

        async def _search():
            return await self.client.search_by_template(template)

        return self.loop.run_until_complete(_search())

    def search_similar_by_template(self, pattern):
        """Поиск похожих конструкций через KPM"""

        async def _search():
            return await self.kpm.search_similar_by_template(pattern)

        return self.loop.run_until_complete(_search())

    def generate_scs_code(self, construction):
        """Генерация SCs кода через KPM"""

        async def _generate():
            return await self.kpm.generate_scs_code(construction)

        return self.loop.run_until_complete(_generate())

    def close(self):
        """Закрытие соединения"""
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)


# Инициализация WebSocket клиента
sc_wrapper = ScClientWrapper(SC_SERVER_URL)

with app.app_context():
    sc_wrapper.start()


# === API Endpoints ===


@app.route("/")
def index():
    return send_from_directory("../static", "index.html")


@app.route("/api/node/create", methods=["POST"])
def create_node():
    """Создание узла"""
    data = request.json
    node_type = data.get("type", sc_type.NODE)
    idtf = data.get("idtf", None)

    try:
        result = sc_wrapper.create_node(node_type, idtf)
        return jsonify({"status": "ok", "addr": str(result)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/edge/create", methods=["POST"])
def create_edge():
    """Создание дуги"""
    data = request.json
    edge_type = data.get("type", sc_type.ARC_COMMON)
    source = data.get("source")
    target = data.get("target")

    try:
        result = sc_wrapper.create_edge(edge_type, source, target)
        return jsonify({"status": "ok", "addr": str(result)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/keynodes/resolve", methods=["POST"])
def resolve_keynodes():
    """Резолвинг идентификаторов"""
    data = request.json
    identifiers = data.get("identifiers", [])

    try:
        result = sc_wrapper.resolve_keynodes(identifiers)
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/template/search", methods=["POST"])
def search_template():
    """Поиск по шаблону"""
    data = request.json
    template = data.get("template")

    try:
        result = sc_wrapper.search_by_template(template)
        return jsonify({"status": "ok", "result": str(result)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/kpm/search_similar", methods=["POST"])
def kpm_search_similar():
    """Поиск похожих конструкций через KPM"""
    data = request.json
    pattern = data.get("pattern")

    try:
        result = sc_wrapper.search_similar_by_template(pattern)
        return jsonify({"status": "ok", "result": str(result)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/kpm/generate_scs", methods=["POST"])
def kpm_generate_scs():
    """Генерация SCs кода через KPM"""
    data = request.json
    construction = data.get("construction")

    try:
        result = sc_wrapper.generate_scs_code(construction)
        return jsonify({"status": "ok", "result": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# === Static files ===


@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("../static", filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
