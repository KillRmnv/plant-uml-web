#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request

from server.cache import Cache


EMBED_CSS = """<style>
#static-window-container, #history-container, #footer, 
.navbar-fixed-bottom, .mode-switching-panel, .navbar-default { display: none !important; }
#window-container { width: 100% !important; }
#main-container { left: 0 !important; width: 100% !important; }
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Переопределить метод, чтобы всегда возвращал SCg
    SCWeb.core.Main.getDefaultExternalLang = function() {
        return "69475";
    };
    
    // 1. Включить экспертный режим
    var checkbox = document.getElementById('mode-switching-checkbox');
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }
    
    // 2. Подождать загрузки языков и выбрать SCg
    function selectSCg() {
        var scgItem = document.querySelector('#history-item-langs li a[sc_addr="69475"]');
        if (scgItem) {
            scgItem.click();
            console.log('[Proxy] SCg mode activated');
        } else {
            setTimeout(selectSCg, 500);
        }
    }
    
    setTimeout(selectSCg, 2000);
});
</script>"""


def inject_css(html_content):
    """Inject CSS to hide sidebar, footer and history in sc-web"""
    if "</head>" in html_content:
        return html_content.replace("</head>", EMBED_CSS + "</head>", 1)
    elif "</body>" in html_content:
        return html_content.replace("</body>", EMBED_CSS + "</body>", 1)
    return html_content


cache = Cache()


class ProxyHandler(SimpleHTTPRequestHandler):
    def _get_content_type(self, path: str) -> str:
        if path.endswith(".html") or path == "/":
            return "text/html; charset=utf-8"
        elif path.endswith(".js"):
            return "application/javascript"
        elif path.endswith(".css"):
            return "text/css"
        elif path.endswith(".png"):
            return "image/png"
        elif path.endswith(".jpg") or path.endswith(".jpeg"):
            return "image/jpeg"
        elif path.endswith(".gif"):
            return "image/gif"
        elif path.endswith(".svg"):
            return "image/svg+xml"
        elif path.endswith(".woff"):
            return "font/woff"
        elif path.endswith(".woff2"):
            return "font/woff2"
        elif path.endswith(".ttf"):
            return "font/ttf"
        elif path.endswith(".ico"):
            return "image/x-icon"
        elif path.endswith(".map"):
            return "application/json"
        return "application/octet-stream"

    def do_GET(self):
        url = "http://localhost:8000" + self.path

        def fetch():
            resp = urllib.request.urlopen(url)
            return resp.read()

        try:
            content = cache.get(self.path, fetch)
            content_type = self._get_content_type(self.path)

            if content_type.startswith("text/html"):
                content = content.decode("utf-8")
                content = inject_css(content)
                content = content.encode("utf-8")

            self.send_response(200)
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
print(f"Cache check interval: {cache._check_interval} seconds (0 = no refresh)")
HTTPServer(("0.0.0.0", 8888), ProxyHandler).serve_forever()
