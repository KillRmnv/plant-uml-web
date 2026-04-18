# PlantUML Web — SCg Editor

Веб-интерфейс для редактирования и визуализации графов знаний с интеграцией OSTIS SC-machine.

## Описание

Проект предоставляет редактор для работы с графовыми конструкциями в формате **ScS** (текстовый) и **SCg** (графический) с возможностью рендеринга в изображения и интеграцией с AI-ассистентом.

### Ключевые возможности

- **Два режима редактирования:**
  - **ScS** — текстовый редактор на базе Monaco Editor с подсветкой синтаксиса
  - **SCg** — графический редактор через интеграцию с SC-Web (iframe)
- **Рендеринг графов** в PNG/SVG форматы
- **AI Ассистент** с поддержкой чатов
- **Автосохранение** сессий в LocalStorage
- **Экспорт/импорт** ScS файлов
- **Синхронизация** с SC-Web (GWF формат)

---

### Компоненты

| Компонент | Порт | Описание |
|-----------|------|----------|
| **Backend API** | :8000 | FastAPI + статика фронтенда |
| **SC-Web (iframe)** | :8000 | Интегрирован в основное приложение |
| **SC-Machine** | :8090 | Внешний sc-machine (требуется отдельно) |

---

## Зависимости

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

---

## Установка и запуск

### 1. Клонирование репозитория

```bash
git clone https://github.com/KillRmnv/plant-uml-web.git
cd plant-uml-web

git submodule update --init --recursive
```

### 2. Быстрая установка

```bash
# Linux/macOS
npm run install:all-linux

# Windows
npm run install:all-win
```

> **Примечание:** Скрипты используют прямой вызов `.venv/bin/pip` вместо `source .venv/bin/activate`, поэтому работают в любом shell (bash, fish, zsh).

### 3. Конфигурация

Скопируйте шаблон и заполните обязательные переменные:

```bash
cp .env.example .env
```

**Обязательная переменная:**
- `DATABASE_URL` — строка подключения к PostgreSQL (например, `postgresql+asyncpg://user:pass@localhost:5432/plantuml_web`)

**Опциональные переменные (дефолты разумные):**
- `SC_WEB_ROOT` — путь к sc-web (по умолчанию: `<проект>/external/sc-web`)
- `SC_SERVER_HOST` / `SC_SERVER_PORT` — хост/порт sc-machine (по умолчанию: `localhost:8090`)
- `HOST` / `PORT` — хост/порт приложения (по умолчанию: `0.0.0.0:8000`)

### 4. Запуск

Для запуска требуется запущенная sc-machine по адресу `ws://localhost:8090/ws_json`.

```bash
npm run start:backend
# Доступен: http://localhost:8000
```

### Запуск без npm-скриптов (вручную)

```bash
# Создание venv и установка зависимостей
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm install
cd external/sc-web && npm install && npm run build && cd ../..

# Копирование конфига
cp .env.example .env
# Отредактируй .env

# Запуск
PYTHONPATH=src .venv/bin/python -m backend.main
```

---

## Конфигурация

### Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `DATABASE_URL` | *(обязательная)* | PostgreSQL (asyncpg) |
| `SC_SERVER_HOST` | `localhost` | Хост sc-machine |
| `SC_SERVER_PORT` | `8090` | Порт sc-machine |
| `SC_WEB_ROOT` | `<проект>/external/sc-web` | Путь к корню sc-web |
| `HOST` | `0.0.0.0` | Хост приложения |
| `PORT` | `8000` | Порт приложения |
| `ALLOWED_ORIGINS` | `*` | CORS (через запятую или `*`) |

### Настройка подключения к sc-machine

```bash
# Linux/macOS
export SC_SERVER_HOST=your-server
export SC_SERVER_PORT=8090

# Windows (PowerShell)
$env:SC_SERVER_HOST="your-server"
$env:SC_SERVER_PORT="8090"
```

---

## Структура проекта

```
plant-uml-web/
├── src/
│   ├── frontend/                    # Фронтенд приложение
│   │   ├── index.html               # Страница авторизации
│   │   ├── app.html                # Главная страница приложения
│   │   ├── sc-web-iframe.html      # SC-Web в iframe
│   │   ├── css/                    # Стили
│   │   └── js/
│   │       ├── app.js              # Главный контроллер
│   │       ├── sc-web-main.js      # SC-Web инициализация + API rewrite
│   │       ├── api/client.js       # API клиент
│   │       ├── auth/               # Аутентификация
│   │       ├── editors/            # Управление редакторами
│   │       ├── panels/             # Система панелей
│   │       ├── render/             # Рендеринг (ScS/SCg)
│   │       ├── assistant/          # AI ассистент
│   │       └── settings/           # Настройки
│   └── backend/                    # Backend (FastAPI, Clean Architecture)
│       ├── main.py                 # Точка входа
│       ├── app/
│       │   ├── config.py                 # Pydantic settings
│       │   ├── core/                     # Общие утилиты (security, декораторы, обработчики ошибок)
│       │   ├── domain/                   # Доменный слой (исключения, VO, интерфейсы)
│       │   │   ├── users/
│       │   │   └── chat/
│       │   ├── application/              # Прикладные сервисы / use cases и DTO
│       │   │   ├── users/                #   services, settings_services, schemas
│       │   │   └── chat/                 #   services, schemas
│       │   ├── infrastructure/           # Реализации (ORM, внешние API)
│       │   │   ├── db/                   #   подключение к БД, Base
│       │   │   ├── persistence/          #   модели SQLAlchemy + репозитории
│       │   │   ├── llm/                  #   клиент LLM провайдеров
│       │   │   └── sc_machine/           #   интеграция sc-machine
│       │   └── presentation/             # Презентационный слой
│       │       └── api/v1/routes/        #   FastAPI роутеры + dependencies
│       ├── handlers/               # Обработчики (legacy, удалён)
│       ├── templates/              # Jinja2 шаблоны
│       └── alembic/                # Миграции БД
├── external/
│   ├── sc-web/                    # SC-Web платформа
│   ├── py-sc-client/              # Python клиент для sc-machine
│   └── py-sc-kpm/                 # Knowledge Processing Module
├── .env.example                   # Шаблон переменных окружения
├── package.json                   # Node.js зависимости и скрипты
├── requirements.txt               # Python зависимости (единый)
├── Dockerfile                     # Docker образ
└── Gruntfile.js                   # Grunt задачи
```

---

## Сборка SC-Web

```bash
npm run build:sc-web
```

---

## NPM скрипты

| Команда | Описание |
|---------|----------|
| `npm run install:all-linux` | Создать venv + установить все зависимости + собрать SC-Web |
| `npm run install:all-win` | То же для Windows |
| `npm run start:backend` | Запустить FastAPI сервер |
| `npm run build:sc-web` | Собрать SC-Web из submodule |
| `npm run build:backend` | Установить Python зависимости в существующий venv |

---

## Добавление новых ScS ключевых слов

Отредактируйте `src/frontend/js/editors/scs-bundle/scs-language.js`:

```javascript
const kKeywords = [
    'sc_const', 'sc_var',
    // добавьте новые ключевые слова
];
```

---

## API

SC-web legacy endpoints доступны под префиксом `/api/v1/sc-web/`. Фронтенд автоматически переписывает старые URL через `sc-web-main.js`:

| Старый URL | Новый URL |
|------------|-----------|
| `/api/user/` | `/api/v1/sc-web/user/` |
| `/api/context/` | `/api/v1/sc-web/context/` |
| `/api/cmd/do/` | `/api/v1/sc-web/cmd/do/` |
| `/api/languages/` | `/api/v1/sc-web/languages/` |

---

## Ссылки

- [OSTIS](https://ostis.net/)
- [sc-machine](https://github.com/ostis-ai/sc-machine)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
