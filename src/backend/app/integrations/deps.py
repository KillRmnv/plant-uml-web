# Dependencies - SC-Client integration
import sys
from pathlib import Path

import logging
from sc_client import client
from sc_client.constants.exceptions import ServerError
from sc_client.sc_keynodes import ScKeynodes

from backend.app.integrations.keynodes import KeynodeSysIdentifiers
from backend.app.integrations.scs_loader import load_scs_fragments

# Add external packages to path
BASE_DIR = Path(__file__).resolve().parent
EXTERNAL_PATH = BASE_DIR.parent.parent / "external"
sys.path.insert(0, str(EXTERNAL_PATH / "py-sc-client" / "src"))
sys.path.insert(0, str(EXTERNAL_PATH / "py-sc-kpm" / "src"))

logger = logging.getLogger()

_sc_initialized = False


def init_sc_client(
    server_url: str,
    reconnect_retries: int = 5,
    reconnect_retry_delay: float = 2.0,
    repo_file_path: str = None,
):
    """Initialize SC-Client connection"""
    global _sc_initialized

    if _sc_initialized:
        return

    def on_error(e):
        logger.error(f"SC-Client error: {e}")

    def post_reconnect():
        try:
            if repo_file_path:
                logger.info(f"Load sc-web kb model from: {repo_file_path}")
                load_scs_fragments(repo_file_path)
        except ServerError as e:
            logger.error(f"Error loading scs: {e}")

        logger.info("Resolve keynodes")
        ScKeynodes().resolve_identifiers([KeynodeSysIdentifiers])

    def reconnect():
        logger.info(f"Reconnecting to SC server: {server_url}")
        client.connect(server_url)

    client.set_error_handler(on_error)
    client.set_reconnect_handler(
        reconnect_handler=reconnect,
        post_reconnect_handler=post_reconnect,
        reconnect_retries=reconnect_retries,
        reconnect_retry_delay=reconnect_retry_delay,
    )

    client.connect(server_url)
    _sc_initialized = True
    logger.info(f"Connected to SC server: {server_url}")


def disconnect():
    """Disconnect from SC server"""
    global _sc_initialized
    client.disconnect()
    _sc_initialized = False


def get_client():
    """Get SC-Client instance"""
    return client


def get_keynodes():
    """Get SC-Keynodes instance"""
    return ScKeynodes()
