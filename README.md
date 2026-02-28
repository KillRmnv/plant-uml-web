# Plant UML Web - SCg Editor

SCg Editor для визуализации и редактирования графов знаний с интеграцией OSTIS.

## Описание

Проект представляет собой веб-интерфейс для редактирования графовых конструкций с использованием SCg (Semantic Code Graph) редактора из OSTIS Web Platform.

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
npm run build

cd ../..



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

### Ошибка подключения к sc-machine

```bash
# Проверьте что sc-machine запущен
# URL по умолчанию: ws://localhost:8090/ws_json

# Изменить URL можно через переменную окружения
SC_SERVER_URL=ws://your-server:8090/ws_json python src/backend/app.py
```
