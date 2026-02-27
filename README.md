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

### Установка Node.js зависимостей

```bash
# Установить Node.js зависимости проекта
npm install

# Установить зависимости sc-web (для сборки)
cd external/sc-web
npm install
npm run build
cd ../..

# Скопировать HTML панели SCg в static/
cp external/sc-web/client/static/components/html/*.html static/html/

# Скопировать CSS стили SCg в static/css
cp external/sc-web/components/scg/static/components/css/*.css static/css/
```

### Структура подключения файлов

- **JavaScript** - подключаются напрямую из `external/sc-web/`:
  - Dependencies: `external/sc-web/client/static/common/`
  - SCWeb Core: `external/sc-web/client/static/components/js/`
  - SCWeb Core/Ui: `external/sc-web/client/js/Core/`, `external/sc-web/client/js/Ui/`
  - SCg Editor: `external/sc-web/components/scg/src/`

- **CSS** - копируются в `static/css/`:
  - scg.css, bootstrap-override.css

- **HTML** - копируются в `static/html/`:
  - scg-tools-panel.html, scg-types-panel-*.html и др.

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
# Проверьте что SCg собран
ls static/components/js/scg/scg.js

# Если файла нет - пересобрать
cd external/sc-web && npm run build
npm run copy:scg
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

## История сборки

После выполнения `npm run copy:scg` (или `npx grunt copy:scg`) в директории `static/` копируются:

### Минимальные файлы для работы
- `static/css/scg.css` - стили SCg
- `static/css/bootstrap-override.css` - переопределение стилей Bootstrap
- `static/css/common.css` - общие стили SCWeb
- `static/js/scg/scg.js` - скомпилированный SCg Editor
- `static/js/scs/scs.js` - скомпилированный SCS Editor
- `static/html/scg-*.html` - HTML панелей SCg

### Подключение напрямую из external/sc-web
JavaScript модули SCWeb подключаются напрямую из исходников:
- `external/sc-web/client/static/common/` - jQuery, Bootstrap, D3, Kinetic и др.
- `external/sc-web/client/js/Core/` - Core модули SCWeb
- `external/sc-web/client/js/Ui/` - UI модули SCWeb
- `external/sc-web/components/scg/src/` - исходники SCg Editor
