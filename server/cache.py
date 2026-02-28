import os
import time
from typing import Dict, Callable


class Cache:
    def __init__(self):
        self._cache: Dict[str, dict] = {}
        self._check_interval = int(os.environ.get("CACHE_CHECK_INTERVAL", 0))
        print(f"[Cache] Initialized with interval: {self._check_interval}s")

    def _is_static(self, path: str) -> bool:
        static_extensions = (
            ".js",
            ".css",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".woff",
            ".woff2",
            ".ttf",
            ".svg",
            ".ico",
            ".map",
        )
        return any(path.endswith(ext) for ext in static_extensions)

    def get(self, path: str, fetch_func: Callable[[], bytes]) -> bytes:
        now = time.time()
        cached = self._cache.get(path)

        if cached is None:
            content = fetch_func()
            self._cache[path] = {"content": content, "last_check": now}
            print(f"[Cache] MISS: {path} ({len(content)} bytes)")
            return content

        if self._check_interval > 0:
            if now - cached["last_check"] >= self._check_interval:
                content = fetch_func()
                self._cache[path] = {"content": content, "last_check": now}
                print(f"[Cache] REFRESH: {path} ({len(content)} bytes)")
                return content

        print(f"[Cache] HIT: {path}")
        return cached["content"]

    def clear(self):
        self._cache.clear()
        print("[Cache] Cleared")
