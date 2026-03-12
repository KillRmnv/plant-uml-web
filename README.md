# PlantUML Web — SCg Editor

Веб-интерфейс для редактирования и визуализации графов знаний с интеграцией OSTIS SC-machine.

## Описание

Проект предоставляет редактор для работы с графовыми конструкциями в формате **ScS** (текстовый) и **SCg** (графический) с возможностью рендеринга в изображения и интеграцией с AI-ассистентом.

### Клювые возможности

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

### 3. Запуск

Для запуска требуется запущенная sc-machine по адресу `ws://localhost:8090/ws_json` либо указать через переменную окружения `SC_SERVER_HOST` и `SC_SERVER_PORT`.

```bash
npm run start:backend
# Доступен: http://localhost:8000
```

---

## Конфигурация

### Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|------------|----------------------|----------|
| `SC_SERVER_HOST` | `localhost` | Хост sc-machine |
| `SC_SERVER_PORT` | `8090` | Порт sc-machine |
| `HOST` | `0.0.0.0` | Хост приложения |
| `PORT` | `8000` | Порт приложения |

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
│   │   │   ├── main.css            # Базовые стили
│   │   │   ├── panels.css          # Система панелей
│   │   │   ├── editor.css          # Редакторы
│   │   │   ├── assistant.css       # AI ассистент
│   │   │   └── settings.css        # Настройки
│   │   └── js/
│   │       ├── app.js              # Главный контроллер
│   │       ├── config.js           # Конфигурация
│   │       ├── sc-web-main.js      # SC-Web инициализация
│   │       ├── api/
│   │       │   └── client.js       # API клиент
│   │       ├── auth/
│   │       │   ├── auth-manager.js # Менеджер авторизации
│   │       │   └── auth-page.js   # Страница авторизации
│   │       ├── editors/
│   │       │   ├── editor-manager.js      # Управление редакторами
│   │       │   └── scs-bundle/
│   │       │       └── scs-language.js   # Поддержка ScS
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
│   └── backend/                    # Backend (FastAPI)
│       ├── main.py                 # Точка входа
│       ├── config.py               # Конфигурация
│       ├── deps.py                 # Зависимости
│       └── router.py               # Роутер API
├── external/
│   ├── sc-web/                    # SC-Web платформа
│   ├── py-sc-client/              # Python клиент для sc-machine
│   └── py-sc-kpm/                 # Knowledge Processing Module
├── package.json                   # Node.js зависимости
├── requirements.txt               # Python зависимости
└── README.md                      # Документация
```

---

## Сборка SC-Web

```bash
npm run build:sc-web
```

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

## Ссылки

- [OSTIS](https://ostis.net/)
- [sc-machine](https://github.com/ostis-ai/sc-machine)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
