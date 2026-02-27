# sc-web - Структура и точка входа

## Общая структура проекта

```
sc-web/
├── .dockerignore
├── .git/
├── .github/
├── .gitignore
├── .gitmodules
├── client/                 # Фронтенд
├── components/             # Компоненты
├── docs/
├── Dockerfile
├── Gruntfile.js           # Сборка фронтенда
├── index.html             # HTML точка входа
├── node_modules/
├── package-lock.json
├── package.json
├── README.md
├── repo.path
├── requirements.txt       # Python зависимости
├── sc-web.ini
├── scripts/
├── server/                # Бэкенд (Tornado)
├── specification.scs
```

## Точка входа

### Серверная часть (Python + Tornado)

**Файл:** `server/app.py`

Это главный файл приложения. Запуск:

```bash
python server/app.py
```

Или с конфигурационным файлом:
```bash
python server/app.py --cfg=sc-web.ini
```

#### Основные параметры командной строки:

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `--static_path` | `../client/static` | Путь к статическим файлам |
| `--templates_path` | `../client/templates` | Путь к шаблонам |
| `--host` | `localhost` | Хост |
| `--port` | `8000` | Порт |
| `--server_host` | `localhost` | Хост sc-server |
| `--server_port` | `8090` | Порт sc-server |
| `--public_url` | `ws://localhost:8090/ws_json` | WebSocket URL |
| `--cfg` | `""` | Путь к конфиг файлу |
| `--google_client_id` | `""` | Google OAuth client ID |
| `--google_client_secret` | `""` | Google OAuth secret |
| `--db_path` | `data.db` | Путь к БД |

#### Архитектура сервера:

```
server/
├── app.py                 # Главный файл - точка входа
├── db.py                  # Работа с БД
├── secret.py              # Секреты
├── keynodes.py            # Keynode идентификаторы
├── scs_loader.py          # Загрузка scs фрагментов
├── logger_sc.py           # Логирование
├── decorators.py          # Декораторы
├── handlers/              # Обработчики HTTP
│   ├── __init__.py
│   ├── api.py             # API endpoints
│   ├── api_logic.py       # Логика API
│   ├── auth.py            # Аутентификация
│   ├── base.py            # Базовый класс
│   ├── main.py            # Главный обработчик
│   └── nl.py              # Natural Language поиск
├── admin/                 # Админ панель
│   ├── main.py
│   ├── __init__.py
│   └── users.py
└── apiai/                 # API.ai интеграция
    ├── __init__.py
    ├── apiai.py
    ├── VAD.py
    ├── resampler.py
    └── LICENSE
```

### Клиентская часть

**Файл:** `index.html`

```html
<!DOCTYPE HTML>
<html lang="en-US">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>sc-web</title>
    </head>
    <body onload="document.getElementById('scg').click();" >
        If you are not redirected automatically, follow the <a href='components/scg/scg.html' id='scg' > link to scg</a>
    </body>
</html>
```

Перенаправляет на `components/scg/scg.html`.

### Сборка фронтенда

**Файл:** `package.json`

```json
{
  "name": "sc-web",
  "version": "0.9.0",
  "module": "commonjs",
  "scripts": {
    "build": "grunt build",
    "serve": "grunt",
    "test": "grunt test"
  },
  "dependencies": {
    "grunt": "^1.0.1",
    "ts-sc-client": "^0.5.0"
  },
  "devDependencies": {
    "grunt-contrib-concat": "^1.0.1",
    "grunt-contrib-copy": "^1.0.0",
    "grunt-contrib-watch": "^1.0.0",
    "grunt-cli": "^1.4.3"
  }
}
```

**Файл:** `Gruntfile.js` - собирает JS/CSS из исходников в `client/static/`.

### Python зависимости (requirements.txt)

```
tornado
future
sqlalchemy
numpy
configparser
py-sc-client==0.4.0
```

## Маршруты (Routes)

В `server/app.py:init_app_rules()`:

```python
(r"/", MainHandler)                                    # Главная страница
(r"/static/(.*)", NoCacheStaticHandler)                # Статика

# API
(r"/api/context/", api.ContextMenu)                    # Контекстное меню
(r"/api/cmd/do/", api.CmdDo)                           # Выполнение команд
(r"/api/cmd/text/", NaturalLanguageSearch)             # NL поиск
(r"/api/action/result/translate/", api.ActionResultTranslate)
(r"/api/languages/", api.Languages)                    # Языки
(r"/api/languages/set/", api.LanguageSet)
(r"/api/info/tooltip/", api.InfoTooltip)               # Тултипы
(r"/api/user/", api.User)                               # Пользователи

# Аутентификация
(r"/auth/google$", auth.GoogleOAuth2LoginHandler)
(r"/auth/logout$", auth.LogOut)

# Админ
(r"/admin$", admin.MainHandler)
(r"/admin/users/get$", admin_users.UsersInfo)
(r"/admin/users/set_rights$", admin_users.UserSetRights)
(r"/admin/users/list_rights$", admin_users.UserListRights)
```

## Основные компоненты

- **SCG** (Semantic Code Graph) - `components/scg/`
- **SCS** (Semantic Code System) - `components/scs/`
- **HTML** - `components/html/`
- **GitHub** - `components/github/`

## Docker

Для запуска используется Dockerfile в корне проекта.
