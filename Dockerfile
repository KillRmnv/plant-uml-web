
FROM node:18-alpine AS scweb-builder

WORKDIR /app

COPY external/sc-web ./external/sc-web

RUN cd external/sc-web && npm install && npm run build

FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .


COPY external/ ./external/

RUN pip install --no-cache-dir -r requirements.txt


COPY package*.json ./
RUN npm install --production


COPY src/frontend/ ./src/frontend/

COPY server/ ./server/

COPY src/backend/ ./src/backend/ 2>/dev/null || true


ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV SC_SERVER_URL=ws://host.docker.internal:8090/ws_json
ENV CACHE_CHECK_INTERVAL=0


# 3000 - Frontend HTTP server
# 8888 - Proxy server (SC-Web)
# 5000 - Backend Flask API (если реализован)
EXPOSE 3000 8888 5000


HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1


COPY <<EOF /app/start.sh
#!/bin/bash
set -e

echo "PlantUML Web - Starting Services"
echo ""
echo "Frontend:  http://localhost:3000"
echo "Proxy:     http://localhost:8888 (→ sc-web :8000)"
echo "Backend:   http://localhost:5000 (API)"
echo ""
echo "SC Server: \${SC_SERVER_URL:-ws://host.docker.internal:8090/ws_json}"
echo ""

# Запуск фонового proxy сервера (для SC-Web)
echo "[1/3] Starting Proxy Server on :8888..."
PYTHONPATH=/app python /app/server/proxy_server.py &
PROXY_PID=\$!

# Запуск фронтенд сервера
echo "[2/3] Starting Frontend Server on :3000..."
python -m http.server 3000 --directory /app/src/frontend &
FRONTEND_PID=\$!

# Запуск backend (если существует app.py)
if [ -f /app/src/backend/app.py ]; then
    echo "[3/3] Starting Backend API on :5000..."
    python /app/src/backend/app.py &
    BACKEND_PID=\$!
else
    echo "[3/3] Backend not found (src/backend/app.py), skipping..."
fi

echo ""
echo "========================================"
echo "Services started:"
echo "  - Frontend PID: \$FRONTEND_PID"
echo "  - Proxy PID:    \$PROXY_PID"
if [ -n "\$BACKEND_PID" ]; then
    echo "  - Backend PID:  \$BACKEND_PID"
fi
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Ожидание сигналов завершения
wait
EOF

RUN chmod +x /app/start.sh

# Запуск по умолчанию
CMD ["/app/start.sh"]
