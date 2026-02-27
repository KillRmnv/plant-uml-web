#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.parse


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            url = "http://localhost:8889" + self.path
            try:
                resp = urllib.request.urlopen(url)
                self.send_response(resp.status)
                self.send_header(
                    "Content-Type", resp.headers.get("Content-Type", "application/json")
                )
                self.end_headers()
                self.wfile.write(resp.read())
            except Exception as e:
                self.send_error(502, str(e))
        else:
            return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.startswith("/api/"):
            url = "http://localhost:8889" + self.path
            length = int(self.headers.get("Content-Length", 0))
            data = self.rfile.read(length)
            try:
                resp = urllib.request.urlopen(url, data=data)
                self.send_response(resp.status)
                self.send_header(
                    "Content-Type", resp.headers.get("Content-Type", "application/json")
                )
                self.end_headers()
                self.wfile.write(resp.read())
            except Exception as e:
                self.send_error(502, str(e))
        else:
            self.send_error(404)


print("Starting proxy server on http://0.0.0.0:8888")
print("API requests will be proxied to http://localhost:8889")
HTTPServer(("0.0.0.0", 8888), ProxyHandler).serve_forever()
