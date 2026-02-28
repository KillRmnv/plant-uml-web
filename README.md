# PlantUML Web — SCg Editor

Веб-интерфейс для редактирования и визуализации графов знаний с интеграцией OSTIS SC-machine.

##  Описание

Проект предоставляет редактор для работы с графовыми конструкциями в формате **ScS** (текстовый) и **SCg** (графический) с возможностью рендеринга в изображения и интеграцией с AI-ассистентом.

### Ключевые возможности

-  **Два режима редактирования:**
  - **ScS** — текстовый редактор на базе Monaco Editor с подсветкой синтаксиса
  - **SCg** — графический редактор через интеграцию с SC-Web
-  **Рендеринг графов** в PNG/SVG форматы
-  **AI Ассистент** с поддержкой чатов и режимами «Помощник»/«Аналитик»
-  **Автосохранение** сессий в LocalStorage
-  **Экспорт/импорт** ScS файлов
-  **Синхронизация** с SC-Web (GWF формат)

---


### Компоненты

| Компонент | Порт | Описание |
|-----------|------|----------|
| **Frontend** | :3000 | Vanilla JS + Monaco Editor (CDN) |
| **Backend API** | :5000 |  |
| **Proxy Server** | :8888 | Прокси на SC-Web с кэшированием |
| **SC-Web** | :8000 | OSTIS Web Platform (графический редактор) |
| **SC-Machine** | :8090 | Внешний sc-machine (требуется отдельно) |

---

##  Зависимости

### Системные требования

- **Python 3.8+**
- **Node.js 16+**
- **Git**

### Git Submodules

Проект использует submodules в директории `external/`:

| Submodule | Описание |
|-----------|----------|
| `external/sc-web` | SCg Editor компонент (OSTIS Web Platform) |
| `external/py-sc-client` | Python клиент для sc-machine |
| `external/py-sc-kpm` | Knowledge Processing Module |
| `external/scs-js-editor` | ScS editor |


---

##  Установка и запуск

### 1. Клонирование репозитория

```bash
# Клонирование с инициализацией submodules
git clone https://github.com/KillRmnv/plant-uml-web.git
cd plant-uml-web

git submodule update --init --recursive
```
### Быстрая установка с npm:

```bash
#Linux/macOS
npm run install:all-linux
 # or
 npm run build:sc-web
 npm run build:backend-linux

#Windows 
npm run install:all-win
# or
npm run build:sc-web
npm run build:backend-win

```
### 2. Установка Python зависимостей

```bash
# Создание виртуального окружения
python3 -m venv .venv

# Активация виртуального окружения
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt
```

### 3. Установка Node.js зависимостей и сборка SC-Web

```bash
# Установка зависимостей проекта
npm install

# Сборка SC-Web
cd external/sc-web
npm install
npm run build
cd ../..
```

### 4. Запуск сервисов

Для запуска требуется запущенная sc-machine по адресу ws://localhost:8090/ws_json либо указать через переменную окружения SC_MACHINE_URL
#### Вариант A: Через npm

Откройте **четыре терминала**:
```bash 
    #work
    npm run start:frontend
    #work
    npm run start:proxy
    #backend implemented
    npm run start:backend
    #work
    npm run start:sc-web
```
#### Вариант B: Покомпонентный запуск (рекомендуется для разработки)

Откройте **четыре терминала**:

```bash
# Терминал 1: Proxy Server (SC-Web)
# Проксирует запросы на localhost:8000, кэширует статику
PYTHONPATH=. python server/proxy_server.py
# Доступен: http://localhost:8888

# Терминал 2: Frontend Server
python -m http.server 3000 --directory src/frontend
# Доступен: http://localhost:3000

# Терминал 3: Backend API (если реализован)
python src/backend/app.py
# Доступен: http://localhost:5000
 
python external/sc-web/server/app.py
# Доступен: http://localhost:8000
```


#### Вариант B: Docker

```bash
docker build -t plant-uml-web .

docker run -p 3000:3000 -p 8888:8888 -p 5000:5000 \
  -e SC_SERVER_URL=ws://host.docker.internal:8090/ws_json \
  plant-uml-web
```

> **Примечание:** Для доступа к sc-machine из Docker используйте `host.docker.internal` (Linux: `--add-host=host.docker.internal:host-gateway`)

---

##  Конфигурация

### Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `SC_SERVER_URL` | `ws://localhost:8090/ws_json` | URL подключения к sc-machine |
| `CACHE_CHECK_INTERVAL` | `0` | Интервал обновления кэша proxy (сек, 0 = без обновления) |
| `PYTHONUNBUFFERED` | `1` | Буферизация вывода Python |

### Настройка подключения к sc-machine

```bash
# Linux/macOS
export SC_SERVER_URL=ws://your-server:8090/ws_json

# Windows (PowerShell)
$env:SC_SERVER_URL="ws://your-server:8090/ws_json"
```

---

##  Структура проекта

```
plant-uml-web/
├── src/
│   ├── frontend/              # Фронтенд приложение
│   │   ├── index.html         # Главная страница
│   │   ├── sc-web-iframe.html # Iframe для SC-Web
│   │   ├── css/               # Стили
│   │   │   ├── main.css       # Базовые стили
│   │   │   ├── panels.css     # Система панелей
│   │   │   ├── editor.css     # Редакторы
│   │   │   ├── assistant.css  # AI ассистент
│   │   │   └── settings.css   # Настройки
│   │   └── js/
│   │       ├── app.js         # Главный контроллер
│   │       ├── config.js      # Конфигурация
│   │       ├── api/
│   │       │   └── client.js  # API клиент
│   │       ├── editors/
│   │       │   ├── editor-manager.js
│   │       │   └── scs-bundle/
│   │       │       └── scs-language.js  # Поддержка ScS
│   │       ├── panels/
│   │       │   ├── panel-system.js
│   │       │   ├── resizable.js
│   │       │   └── collapsible.js
│   │       ├── render/
│   │       │   ├── factory.js
│   │       │   ├── scs-render.js
│   │       │   └── scg-render.js
│   │       ├── assistant/
│   │       │   ├── panel.js
│   │       │   ├── chat-list.js
│   │       │   └── chat-window.js
│   │       └── settings/
│   │           └── modal.js
│   └── backend/               # Backend (Flask)
│       └── app.py             # API endpoints
├── server/
│   ├── proxy_server.py        # Proxy сервер для SC-Web
│   └── cache.py               # Кэширование статики
├── external/
│   ├── sc-web/                # SC-Web платформа
│   ├── py-sc-client/          # Python клиент для sc-machine
│   └── py-sc-kpm/             # Knowledge Processing Module
├── package.json               # Node.js зависимости
├── requirements.txt           # Python зависимости
├── Dockerfile                 # Docker образ
└── README.md                  # Документация
```


### Сборка SC-Web

```bash
cd external/sc-web
npm install
npm run build
```

### Добавление новых ScS ключевых слов

Отредактируйте `src/frontend/js/editors/scs-bundle/scs-language.js`:

```javascript
const kKeywords = [
    'sc_const', 'sc_var',
    // добавьте новые ключевые слова
];
```


---

##  Ссылки

- [OSTIS](https://ostis.net/)
- [sc-machine](https://github.com/ostis-ai/sc-machine)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
