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

### Установка Node.js зависимостей

```bash
# Установить Node.js зависимости проекта
npm install

<<<<<<< HEAD
# Установить зависимости sc-web (для сборки)
=======
# Установить зависимости sc-web
>>>>>>> frontend_v3.0
cd external/sc-web
npm install
npm run build

cd ../..

<<<<<<< HEAD
# Скопировать HTML панели SCg в static/
cp external/sc-web/client/static/components/html/*.html static/html/

# Скопировать CSS стили SCg в static/css
cp external/sc-web/components/scg/static/components/css/*.css static/css/
```
=======

>>>>>>> frontend_v3.0

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

### Ошибка подключения к sc-machine

```bash
# Проверьте что sc-machine запущен
# URL по умолчанию: ws://localhost:8090/ws_json

# Изменить URL можно через переменную окружения
SC_SERVER_URL=ws://your-server:8090/ws_json python src/backend/app.py
```
<<<<<<< HEAD
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
=======
>>>>>>> frontend_v3.0
