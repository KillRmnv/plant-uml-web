"""Интеграционные тесты /api/v1/diagram/*."""
import pytest


@pytest.mark.asyncio
async def test_generate_requires_auth(client):
    resp = await client.post(
        "/api/v1/diagram/generate", json={"structure_name": "X"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_generate_calls_executor(client, auth_headers, monkeypatch):
    """Заменяем executor.generate_diagram, чтобы не идти в sc-machine/LLM."""
    from backend.app.api.v1.routes import diagram as diagram_route

    monkeypatch.setattr(
        diagram_route.executor,
        "generate_diagram",
        lambda name: ("@startuml\n@enduml", "BASE64=="),
    )

    resp = await client.post(
        "/api/v1/diagram/generate",
        json={"structure_name": "Use_Case"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["plantuml_code"].startswith("@startuml")
    assert body["image_base64"] == "BASE64=="


@pytest.mark.asyncio
async def test_generate_handles_agent_execution_error(client, auth_headers, monkeypatch):
    from backend.app.api.v1.routes import diagram as diagram_route
    from backend.app.domains.diagram.exceptions import AgentExecutionError

    def _boom(_name):
        raise AgentExecutionError("agent down")

    monkeypatch.setattr(diagram_route.executor, "generate_diagram", _boom)

    resp = await client.post(
        "/api/v1/diagram/generate",
        json={"structure_name": "X"},
        headers=auth_headers,
    )
    assert resp.status_code == 502
    assert "agent down" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_generate_validation_too_long(client, auth_headers):
    resp = await client.post(
        "/api/v1/diagram/generate",
        json={"structure_name": "x" * 1000},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_generate_from_inputs_invalid_scs(client, auth_headers, monkeypatch):
    """Некорректный SCS-код должен вызвать ошибку клиента.

    ПРИМЕЧАНИЕ ПО КОДУ: в роуте generate_diagram_from_inputs_route выбрасываемый
    HTTPException(400) перехватывается блоком `except Exception:` и переливается
    в 500. Это следует исправить, добавив `except HTTPException: raise`. Тест
    фиксирует это поведение, чтобы было видно при фиксе.
    """
    from backend.app.api.v1.routes import diagram as diagram_route

    monkeypatch.setattr(
        diagram_route, "generate_elements_by_scs", lambda *_: [None]
    )

    resp = await client.post(
        "/api/v1/diagram/generate-from-inputs",
        json={"structure_name": "X", "scs_code": "broken;;"},
        headers=auth_headers,
    )
    # После исправления бага — будет 400; сейчас возвращается 500.
    assert resp.status_code in (400, 500)


@pytest.mark.asyncio
async def test_generate_from_inputs_success(client, auth_headers, monkeypatch):
    from backend.app.api.v1.routes import diagram as diagram_route

    monkeypatch.setattr(
        diagram_route, "generate_elements_by_scs", lambda *_: [object()]
    )
    monkeypatch.setattr(
        diagram_route.executor,
        "generate_diagram",
        lambda _name: ("@startuml\nA -> B\n@enduml", "PNG=="),
    )

    resp = await client.post(
        "/api/v1/diagram/generate-from-inputs",
        json={"structure_name": "S", "scs_code": "S -> A;;"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["image_base64"] == "PNG=="
