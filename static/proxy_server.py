#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request


EMBED_CSS = """<style>
#static-window-container, #history-container, #footer, 
.navbar-fixed-bottom { display: none !important; }
#window-container { width: 100% !important; }
#main-container { left: 0 !important; width: 100% !important; }
</style>"""


def inject_css(html_content):
    """Inject CSS to hide sidebar, footer and history in sc-web"""
    if "</head>" in html_content:
        return html_content.replace("</head>", EMBED_CSS + "</head>", 1)
    elif "</body>" in html_content:
        return html_content.replace("</body>", EMBED_CSS + "</body>", 1)
    return html_content


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = "http://localhost:8000" + self.path
        try:
            resp = urllib.request.urlopen(url)
            content_type = resp.headers.get("Content-Type", "")

            if "text/html" in content_type:
                content = resp.read().decode("utf-8")
                content = inject_css(content)
                content = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                content = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
        except Exception as e:
            self.send_error(502, str(e))

    def do_POST(self):
        url = "http://localhost:8000" + self.path
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        try:
            resp = urllib.request.urlopen(url, data=data)
            content = resp.read()
            self.send_response(resp.status)
            self.send_header(
                "Content-Type", resp.headers.get("Content-Type", "application/json")
            )
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(502, str(e))


print("Starting proxy server on http://0.0.0.0:8888")
print("All requests will be proxied to http://localhost:8000")
print("HTML responses will have CSS injected to hide sidebar/footer")
HTTPServer(("0.0.0.0", 8888), ProxyHandler).serve_forever()
