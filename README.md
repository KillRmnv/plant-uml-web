# Plant UML Web - SCg Editor

SCg Editor для визуализации и редактирования графов знаний с интеграцией OSTIS.

## Описание

Проект представляет собой веб-интерфейс для редактирования графовых конструкций с использованием SCg (Semantic Code Graph) редактора из OSTIS Web Platform.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  SCg Editor (из external/sc-web)                     │  │
│  │  + jQuery, D3.js                                    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │ HTTP/WebSocket                   │
└──────────────────────────│──────────────────────────────────┘
                           │
┌──────────────────────────│──────────────────────────────────┐
│                    Backend (Flask)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  py-sc-client + py-sc-kpm                            │  │
│  │  (WebSocket к sc-machine)                            │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────│──────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────────┐
                 │    sc-machine      │
                 │  (OSTIS Core)      │
                 └─────────────────────┘
```

## Зависимости

### Git Submodules (в external/)
- **external/sc-web** - SCg Editor компонент
- **external/py-sc-client** - Python клиент для sc-machine
- **external/py-sc-kpm** - Knowledge Processing Module

### Системные требования
- Python 3.8+
- Node.js 16+
- Git

## Установка и запуск

### Клонирование репозитория

```bash
# Клонировать с submodules
git clone --recurse-submodules https://github.com/KillRmnv/plant-uml-web.git

# Или если уже клонировали без submodules:
git clone https://github.com/KillRmnv/plant-uml-web.git
cd plant-uml-web
git submodule update --init --recursive
```

### Установка Python зависимостей

```bash
# Перейти в директорию проекта
cd plant-uml-web

# Создать виртуальное окружение
python3 -m venv .venv

# Активировать виртуальное окружение
source .venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Установить py-sc-client в режиме editable
cd external/py-sc-client
pip install -e .
cd ../..

# Установить py-sc-kpm в режиме editable
cd external/py-sc-kpm
pip install -e .
cd ../..
```

### Установка Node.js зависимостей и сборка SCg

```bash
# Установить Node.js зависимости проекта
npm install

# Установить зависимости sc-web
cd external/sc-web
npm install
cd ../..

# Собрать SCg (выполняет npm run build внутри sc-web)
npm run build:scg

# Скопировать статические файлы SCg в проект
npm run copy:scg

# ВНИМАНИЕ: После copy:scg нужно вручную добавить:
# 1. Файлы команд (если отсутствуют в external/sc-web/client/static/components/js/scg/command/):
#    mkdir -p static/components/js/scg/command
#    cp external/sc-web/components/scg/src/command/*.js static/components/js/scg/command/

# 2. Файлы HTML панелей уже копируются через grunt
```

### Ручная сборка (если npm run copy:scg не работает)

```bash
# Скопировать основные JS файлы из sc-web
cp -r external/sc-web/client/static/components/js/* static/components/js/
cp -r external/sc-web/components/scg/src/*.js static/components/js/scg/
cp -r external/sc-web/components/scg/src/listener static/components/js/scg/

# Скопировать файлы команд (обязательно!)
mkdir -p static/components/js/scg/command
cp external/sc-web/components/scg/src/command/*.js static/components/js/scg/command/

# HTML панели уже должны быть в static/components/html/
# Если нет - скопировать:
cp external/sc-web/components/scg/static/components/html/*.html static/components/html/
```

### Запуск без Docker

**Важно:** Требуется запущенный sc-machine

```bash
# Терминал 1: Запуск Flask backend
# (предварительно активировать .venv)
source .venv/bin/activate
python src/backend/app.py

# Терминал 2: Запуск HTTP сервера для фронтенда
python -m http.server 3000
```

Открыть в браузере: http://localhost:3000

### Запуск с Docker

```bash
# Сборка и запуск
docker-compose up --build
```

## Структура проекта

```
plant-uml-web/
├── external/                    # Git submodules
│   ├── sc-web/                # SCg Editor
│   ├── py-sc-client/          # Python клиент
│   └── py-sc-kpm/             # KPM
├── src/
│   ├── backend/
│   │   └── app.py             # Flask приложение
│   └── frontend/
│       └── index.html         # Главная страница
├── static/                    # Статические файлы
│   ├── components/            # SCg (после сборки)
│   ├── scg-init.js           # Инициализация редактора
│   └── css/                  # Стили проекта
├── .venv/                     # Python виртуальное окружение
├── package.json               # Node.js зависимости
├── requirements.txt           # Python зависимости
├── Gruntfile.js              # Сборка SCg
├── docker-compose.yml        # Docker оркестрация
└── Dockerfile                # Сборка образа
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `SC_SERVER_URL` | URL sc-machine WebSocket | `ws://localhost:8090/ws_json` |
| `DEBUG` | Режим отладки Flask | `True` |

## API Endpoints

### Управление графом

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/node/create` | Создание узла |
| POST | `/api/edge/create` | Создание дуги |
| POST | `/api/link/create` | Создание sc-link |

### Поиск и резолвинг

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/keynodes/resolve` | Резолвинг идентификаторов |
| POST | `/api/template/search` | Поиск по шаблону |

### KPM (Knowledge Processing Module)

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/kpm/search_similar` | Поиск похожих конструкций |
| POST | `/api/kpm/generate_scs` | Генерация SCs кода |

### Системные

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/health` | Проверка здоровья |

## Обновление зависимостей

### Обновление submodules

```bash
# Обновить до последних версий
git submodule update --remote

# Закоммитить изменения
git add external/
git commit -m "Update submodules"

# Пересобрать SCg
npm run copy:scg
```

## Устранение проблем

### Ошибка: Module not found

```bash
# Убедитесь что .venv активирован
source .venv/bin/activate

# Переустановите зависимости
pip install -r requirements.txt
```

### Ошибка: SCg не загружается

```bash
# Проверьте что SCg скопирован
ls static/components/js/scg/scg.js

# Если файла нет - скопировать вручную:
cp -r external/sc-web/client/static/components/js/* static/components/js/
cp -r external/sc-web/components/scg/src/*.js static/components/js/scg/
mkdir -p static/components/js/scg/command
cp external/sc-web/components/scg/src/command/*.js static/components/js/scg/command/
```

### Ошибка: 404 на HTML панелях

```bash
# Проверьте наличие HTML файлов
ls static/components/html/scg-tools-panel.html

# Если нет - скопировать:
cp external/sc-web/components/scg/static/components/html/*.html static/components/html/
```

### Ошибка: SCgCommandManager is not defined

```bash
# Не скопированы файлы команд
mkdir -p static/components/js/scg/command
cp external/sc-web/components/scg/src/command/*.js static/components/js/scg/command/
```

### Ошибка подключения к sc-machine

```bash
# Проверьте что sc-machine запущен
# URL по умолчанию: ws://localhost:8090/ws_json

# Изменить URL можно через переменную окружения
SC_SERVER_URL=ws://your-server:8090/ws_json python src/backend/app.py
```
## Лицензия

MIT
