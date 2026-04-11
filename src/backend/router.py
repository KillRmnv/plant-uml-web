# Router - FastAPI routes adapted from Tornado handlers
import logging
import time

from fastapi import APIRouter, Request, Form

from sc_client import client
from sc_client.constants import sc_type
from sc_client.models import ScAddr
from sc_client.sc_keynodes import ScKeynodes

from backend.app.integrations.keynodes import KeynodeSysIdentifiers
from handlers import api_logic as logic
from backend.app.config import settings

logger = logging.getLogger()
router = APIRouter()


# Mock handler for compatibility with logic.py
class MockHandler:
    def __init__(self, request):
        self.request = request
        self.current_user = None

    def get_secure_cookie(self, name):
        return None

    def set_secure_cookie(self, name, value):
        pass  # No-op for anonymous sessions

    def get_argument(self, name, default=None):
        if self.request:
            return self.request.query_params.get(name, default)
        return default

    def clear(self):
        pass  # No-op


@router.get("/api/context/")
async def api_context():
    """Get context menu / atomic commands"""
    keynodes = ScKeynodes()
    keynode_ui_main_menu = keynodes[KeynodeSysIdentifiers.ui_main_menu.value]

    cmds = []
    logic.find_atomic_commands(keynode_ui_main_menu, cmds)

    return cmds


@router.post("/api/cmd/do/")
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

    handler = MockHandler(request)
    result = logic.do_command(cmd_addr, arguments, handler)

    if result is not None:
        return result

    return {}


@router.get("/api/languages/")
async def api_languages():
    """Get available languages"""
    langs = logic.get_languages_list()
    return [lang.value for lang in langs]


@router.post("/api/languages/set/")
async def api_languages_set(lang_addr: int = Form(...)):
    """Set current language"""
    handler = MockHandler(None)
    sc_session = logic.ScSession(handler)
    sc_session.set_current_lang_mode(ScAddr(lang_addr))

    return {}


@router.post("/api/info/tooltip/")
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

    handler = MockHandler(request)
    sc_session = logic.ScSession(handler)

    result = {}
    for addr in arguments:
        tooltip = logic.find_tooltip(ScAddr(int(addr)), sc_session.get_used_language())
        result[addr] = tooltip

    return result


@router.post("/api/action/result/translate/")
async def api_action_result_translate(
    action: int = Form(...), format: int = Form(...), lang: int = Form(None)
):
    """Translate action result"""
    action_addr = ScAddr(int(action))
    format_addr = ScAddr(int(format))
    lang_addr = ScAddr(int(lang)) if lang else None

    keynodes = ScKeynodes()
    keynode_system_element = keynodes[KeynodeSysIdentifiers.system_element.value]
    ui_rrel_source_sc_construction = keynodes[
        KeynodeSysIdentifiers.ui_rrel_source_sc_construction.value
    ]
    ui_rrel_user_lang = keynodes[KeynodeSysIdentifiers.ui_rrel_user_lang.value]
    ui_command_translate_from_sc = keynodes[
        KeynodeSysIdentifiers.ui_command_translate_from_sc.value
    ]
    ui_command_initiated = keynodes[KeynodeSysIdentifiers.ui_command_initiated.value]

    wait_time = 0
    wait_dt = 0.1

    result = logic.find_result(action_addr)
    while not result:
        time.sleep(wait_dt)
        wait_time += wait_dt
        if wait_time > settings.event_wait_timeout:
            return {"error": "Timeout waiting for result"}
        result = logic.find_result(action_addr)

    if not result:
        return {"error": "Result not found"}

    result_addr = result[0].get(2)
    result_link_addr = logic.find_translation_with_format(result_addr, format_addr)

    if not result_link_addr.is_valid():
        from sc_client.models import ScConstruction

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

        ui_rrel_output_format = keynodes[
            KeynodeSysIdentifiers.ui_rrel_output_format.value
        ]

        client.generate_elements(construction)

        wait_time = 0
        translation = logic.find_translation_with_format(result_addr, format_addr)
        while not translation.is_valid():
            time.sleep(wait_dt)
            wait_time += wait_dt
            if wait_time > settings.event_wait_timeout:
                return {"error": "Timeout waiting for result translation"}
            translation = logic.find_translation_with_format(result_addr, format_addr)

        result_link_addr = translation

    return {"link": result_link_addr.value}


@router.get("/api/user/")
async def api_user():
    """Get current user info"""
    handler = MockHandler(None)
    sc_session = logic.ScSession(handler)
    user_addr = sc_session.get_sc_addr()

    return {
        "sc_addr": user_addr.value,
        "is_authenticated": False,
        "current_lang": sc_session.get_used_language().value,
        "default_ext_lang": sc_session.get_default_ext_lang().value,
        "email": None,
        "roles": [],
    }


@router.get("/api/cmd/text/")
async def api_cmd_text():
    """Natural language command - placeholder"""
    return {}
