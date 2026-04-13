"""SC-web legacy API routes - compatibility with original sc-web frontend."""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Form, Request, Response
from sc_client import client
from sc_client.constants import sc_type
from sc_client.models import ScAddr, ScConstruction
from sc_client.sc_keynodes import ScKeynodes

from backend.app.config import settings
from backend.app.integrations.keynodes import KeynodeSysIdentifiers
from backend.app.integrations.sc_session import (
    ScSession,
    do_command,
    find_atomic_commands,
    find_result,
    find_tooltip,
    find_translation_with_format,
    get_languages_list,
)

logger = logging.getLogger(__name__)

router = APIRouter()

SESSION_COOKIE_NAME = "session_key"
SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60  # 1 year


def _get_session_key(request: Request) -> Optional[str]:
    """Extract session_key from cookie"""
    return request.cookies.get(SESSION_COOKIE_NAME)


def _set_session_cookie(response: Response, session_key: str) -> None:
    """Set session_key cookie on response"""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_key,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )


def _create_sc_session(
    request: Request, response: Optional[Response] = None
) -> ScSession:
    """Create ScSession from request cookies, update cookie if new session created"""
    session_key = _get_session_key(request)
    sc_session = ScSession(session_key=session_key)

    # Trigger session initialization (creates new session_key if None)
    sc_session.get_sc_addr()

    # If new session was created, set cookie
    if response and session_key is None and sc_session.session_key:
        _set_session_cookie(response, sc_session.session_key)

    return sc_session


# ─────────────────────────────────────────────
# Endpoints (paths match SCWeb.core.Server calls)
# ─────────────────────────────────────────────


@router.get("/context/")
async def api_context():
    """Get context menu / atomic commands"""
    keynodes = ScKeynodes()
    keynode_ui_main_menu = keynodes[KeynodeSysIdentifiers.ui_main_menu.value]

    cmds = []
    find_atomic_commands(keynode_ui_main_menu, cmds)

    return cmds


@router.post("/cmd/do/")
async def api_cmd_do(request: Request, cmd: int = Form(...)):
    """Execute command"""
    cmd_addr = ScAddr(int(cmd))

    # Parse arguments from form data
    arguments = []
    form = await request.form()
    idx = 0
    while True:
        arg = form.get(f"{idx}_")
        if arg is None:
            break
        arg_addr = ScAddr(int(arg))
        arguments.append(arg_addr)
        idx += 1

    result = do_command(cmd_addr, arguments, session_key=_get_session_key(request))

    if result is not None:
        return result

    return {}


@router.get("/languages/")
async def api_languages():
    """Get available languages"""
    langs = get_languages_list()
    return [lang.value for lang in langs]


@router.post("/languages/set/")
async def api_languages_set(
    request: Request, response: Response, lang_addr: int = Form(...)
):
    """Set current language"""
    sc_session = _create_sc_session(request, response)
    sc_session.set_current_lang_mode(ScAddr(lang_addr))

    return {}


@router.post("/info/tooltip/")
async def api_info_tooltip(request: Request):
    """Get tooltip info"""
    form = await request.form()

    arguments = []
    idx = 0
    while True:
        arg = form.get(f"{idx}_")
        if arg is None:
            break
        arguments.append(arg)
        idx += 1

    sc_session = _create_sc_session(request)

    result = {}
    for addr in arguments:
        tooltip = find_tooltip(ScAddr(int(addr)), sc_session.get_used_language())
        result[addr] = tooltip

    return result


@router.post("/action/result/translate/")
async def api_action_result_translate(
    action: int = Form(...), format: int = Form(...), lang: int = Form(None)
):
    """Translate action result"""
    action_addr = ScAddr(int(action))
    format_addr = ScAddr(int(format))
    lang_addr = ScAddr(int(lang)) if lang else None

    keynodes = ScKeynodes()
    keynode_system_element = keynodes[KeynodeSysIdentifiers.system_element.value]

    wait_time = 0
    wait_dt = 0.1

    result = find_result(action_addr)
    while not result:
        time.sleep(wait_dt)
        wait_time += wait_dt
        if wait_time > settings.event_wait_timeout:
            return {"error": "Timeout waiting for result"}
        result = find_result(action_addr)

    if not result:
        return {"error": "Result not found"}

    result_addr = result[0].get(2)
    result_link_addr = find_translation_with_format(result_addr, format_addr)

    if not result_link_addr.is_valid():
        construction = ScConstruction()
        construction.generate_node(sc_type.CONST_NODE, "trans_cmd_addr")
        construction.generate_connector(
            sc_type.CONST_PERM_POS_ARC, keynode_system_element, "trans_cmd_addr"
        )
        construction.generate_connector(
            sc_type.CONST_PERM_POS_ARC, "trans_cmd_addr", result_addr, "arc_addr"
        )
        construction.generate_connector(
            sc_type.CONST_PERM_POS_ARC, keynode_system_element, "arc_addr"
        )

        if lang_addr:
            construction.generate_connector(
                sc_type.CONST_PERM_POS_ARC, "trans_cmd_addr", lang_addr, "arc_addr_4"
            )
            construction.generate_connector(
                sc_type.CONST_PERM_POS_ARC, keynode_system_element, "arc_addr_4"
            )

        client.generate_elements(construction)

        wait_time = 0
        translation = find_translation_with_format(result_addr, format_addr)
        while not translation.is_valid():
            time.sleep(wait_dt)
            wait_time += wait_dt
            if wait_time > settings.event_wait_timeout:
                return {"error": "Timeout waiting for result translation"}
            translation = find_translation_with_format(result_addr, format_addr)

        result_link_addr = translation

    return {"link": result_link_addr.value}


@router.get("/user/")
async def api_user(request: Request, response: Response):
    """Get current user info"""
    sc_session = _create_sc_session(request, response)
    user_addr = sc_session.get_sc_addr()

    return {
        "sc_addr": user_addr.value,
        "is_authenticated": bool(sc_session.user_email),
        "current_lang": sc_session.get_used_language().value,
        "default_ext_lang": sc_session.get_default_ext_lang().value,
        "email": sc_session.user_email,
        "roles": [],
    }


@router.get("/cmd/text/")
async def api_cmd_text():
    """Natural language command - placeholder"""
    return {}
