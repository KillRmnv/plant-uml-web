# -*- coding: utf-8 -*-
from typing import Optional, Awaitable

from tornado import web, options
import decorators


class BaseHandler(web.RequestHandler):
    # CORS headers
    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", options.options.allowed_origins)
        self.set_header("Access-Control-Allow-Credentials", "true")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.set_header(
            "Access-Control-Allow-Headers",
            "access-control-allow-origin,authorization,content-type,set-cookie",
        )

    # response to the CORS preflight request
    def options(self):
        # no body
        self.set_status(204)
        self.finish()

    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        raise NotImplementedError()
