# My Project

SCg Editor интеграция с py-sc-client и py-sc-kpm.

## Зависимости

- **external/sc-web** - SCg Editor (Graph component)
- **external/py-sc-client** - Python клиент для sc-machine
- **external/py-sc-kpm** - Knowledge Processing Module для sc-machine

## Структура проекта

```
my-project/
├── external/
│   ├── sc-web/           # Git submodule: SCg Editor
│   ├── py-sc-client/     # Git submodule: Python клиент
│   └── py-sc-kpm/        # Git submodule: KPM
├── src/
│   ├── backend/          # Flask приложение
│   └── frontend/         # HTML
├── static/               # Статические файлы 
├── package.json         # Node.js зависимости
├── requirements.txt     # Python зависимости
├── Gruntfile.js         # Сборка   
└── Dockerfile           # Сборка образа
```

## Быстрый старт

### Локальная разработка

```bash
# 1. Инициализировать submodules
git submodule update --init --recursive

# 2. Установить зависимости
npm install
cd external/sc-web && npm install && npm run build
cd ../..
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Скопировать статику
npm run copy:scg

# 4. Запуск
# Терминал 1: Backend
source .venv/bin/activate
python src/backend/app.py

# Терминал 2: Frontend
python -m http.server 3000
```

### Docker

```bash
# Сборка и запуск
git submodule update --init --recursive
docker-compose up --build
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/node/create | Создание узла |
| POST | /api/edge/create | Создание дуги |
| POST | /api/keynodes/resolve | Резолвинг идентификаторов |
| POST | /api/template/search | Поиск по шаблону |
| POST | /api/kpm/search_similar | Поиск похожих конструкций |
| POST | /api/kpm/generate_scs | Генерация SCs кода |

## Обновление зависимостей

```bash
# Обновить все submodules
git submodule update --remote
git add external/
git commit -m "Update submodules"
npm run copy:scg
```

## Переменные окружения

- `SC_SERVER_URL` - URL sc-machine WebSocket (по умолчанию: ws://localhost:8090/ws_json)
