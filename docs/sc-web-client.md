# SC-Web Client - Архитектура

## Общая структура

```
client/
├── js/                           # Исходники JavaScript
│   ├── Core/                     # Ядро системы
│   │   ├── main.js              # Главная точка входа
│   │   ├── server.js            # Коммуникация с сервером
│   │   ├── componentmanger.js   # Менеджер компонентов
│   │   ├── componentsandbox.js   # Песочница компонентов
│   │   ├── translation.js        # Интернационализация
│   │   ├── eventmanager.js      # Менеджер событий
│   │   ├── arguments.js         # Аргументы
│   │   ├── debug.js            # Отладка
│   │   ├── scg-content-searcher.js # Поиск контента
│   │   └── namespace.js         # Пространство имён
│   │
│   ├── Utils/                   # Утилиты
│   │   ├── sc_types.js         # Типы SC
│   │   ├── sc_keynodes.js      # Ключевые узлы
│   │   ├── sc_helper.js        # Помощник SC
│   │   ├── utils.js           # Общие утилиты
│   │   ├── cache.js           # Кэширование
│   │   ├── cookie.js          # Работа с куки
│   │   ├── fqueue.js         # Очередь
│   │   ├── binary.js         # Бинарные данные
│   │   ├── triples.js        # Триплеты
│   │   ├── stringview.js     # Представление строк
│   │   └── sc_link_helper.js # Работа со ссылками
│   │
│   └── Ui/                      # Пользовательский интерфейс
│       ├── core.js            # UI ядро
│       ├── menu.js           # Меню
│       ├── windowmanager.js  # Менеджер окон
│       ├── langpanel.js      # Панель языка
│       ├── searchpanel.js    # Панель поиска
│       ├── argumentspanel.js # Панель аргументов
│       ├── taskpanel.js      # Панель задач
│       ├── locker.js         # Блокировка UI
│       ├── userpanel.js     # Панель пользователя
│       ├── KeyboardHandler.js # Обработка клавиатуры
│       ├── OpenComponentHandler.js # Открытие компонентов
│       ├── expertmodepanel.js # Экспертный режим
│       └── ExpertModeHandler.js # Обработчик экспертного режима
│
├── static/                      # Собранные статические файлы
│   ├── common/                  # Общие библиотеки
│   │   ├── jquery/
│   │   ├── bootstrap/
│   │   ├── kinetic/
│   │   ├── d3/
│   │   ├── pdf/
│   │   ├── highlight/
│   │   ├── context/
│   │   ├── base64/
│   │   ├── typeahead/
│   │   └── sockjs/
│   │
│   └── components/
│       ├── js/                   # Собранные компоненты
│       │   ├── sc-web-core.js   # Ядро
│       │   ├── scg/scg.js       # SCg компонент
│       │   ├── scs/scs.js       # SCS компонент
│       │   ├── html/html.js     # HTML компонент
│       │   └── github/github.js # GitHub компонент
│       │
│       ├── css/                  # Стили
│       │   ├── common.css
│       │   ├── scg.css
│       │   ├── scs.css
│       │   └── ...
│       │
│       ├── images/              # Изображения
│       │   ├── scg/             # Иконки SCg
│       │   └── ...
│       │
│       └── html/                # HTML шаблоны компонентов
│
└── templates/                    # HTML шаблоны страниц
    ├── base.html                # Базовый шаблон
    ├── common.html              # Общие включения
    ├── components.html          # Подключение компонентов
    └── admin.html               # Админ-панель
```

---

## 1. Инициализация (main.js)

**Файл:** `client/js/Core/main.js`

### Главная точка входа

```javascript
SCWeb.core.Main = {
    init: function (params) {
        return new Promise((resolve) => {
            // 1. Инициализация сервера
            SCWeb.core.Server._initialize();
            
            // 2. Создание SC-клиента
            ScClientCreate().then(function (client) {
                window.scClient = client;
                window.scHelper = new ScHelper(window.scClient);
                window.scKeynodes = new ScKeynodes(window.scHelper);
                
                // 3. Инициализация ключевых узлов
                window.scKeynodes.init().then(function () {
                    window.scHelper.init().then(function () {
                        // 4. Инициализация панели задач
                        SCWeb.ui.TaskPanel.init().then(function () {
                            // 5. Получение данных от сервера
                            SCWeb.core.Server.init(function (data) {
                                self.parseUrl(data, params).then(resolve);
                            });
                        });
                    });
                });
            });
        })
    }
};
```

### Параметры URL

- `action` - адрес SC-элемента для отображения
- `sys_id` - системный идентификатор
- `command_id` - идентификатор команды
- `view_mode` - режим просмотра (0 = Default, 1 = DistanceBased)
- `edit_mode` - режим редактирования (0-5)
- `lang` - язык

---

## 2. Коммуникация с сервером (server.js)

**Файл:** `client/js/Core/server.js`

### Основные методы

| Метод | Описание |
|-------|----------|
| `init(callback)` | Получить начальные данные от сервера |
| `doCommand(cmd_addr, args, callback)` | Выполнить команду |
| `resolveScAddr(idtfList)` | Преобразовать системные идентификаторы в адреса |
| `resolveIdentifiers(objects)` | Получить идентификаторы для адресов |
| `contextMenu(args, callback)` | Получить контекстное меню |
| `textCommand(query, callback)` | Естественно-языковой запрос |
| `getResultTranslated(action, format, lang, callback)` | Получить результат в формате |
| `setLanguage(lang_addr, callback)` | Установить язык |

### Очередь задач

Сервер использует очередь задач для ограничения количества параллельных запросов:

```javascript
_push_task: function (task) {
    this._task_queue.push(task);
    // Обработка с интервалом _task_frequency
}
```

---

## 3. Менеджер компонентов (componentmanger.js)

**Файл:** `client/js/Core/componentmanger.js`

### Регистрация компонента

```javascript
SCWeb.core.ComponentManager.appendComponentInitialize({
    ext_lang: 'scg_code',           // Язык
    formats: ['format_scg_json'],   // Форматы
    struct_support: true,           // Поддержка структур
    factory: function(sandbox) {    // Фабрика
        return new SCgViewerWindow(sandbox);
    }
});
```

### Создание окна компонента

```javascript
createWindowSandboxByFormat: function (options) {
    const sandbox = new SCWeb.core.ComponentSandbox({
        container: options.container,
        addr: options.addr,
        is_struct: options.is_struct,
        format_addr: options.format_addr,
        canEdit: options.canEdit
    });
    
    const component = comp_def.factory(sandbox);
    return sandbox;
}
```

---

## 4. Песочница компонента (componentsandbox.js)

**Файл:** `client/js/Core/componentsandbox.js`

### Sandbox API

| Метод | Описание |
|-------|----------|
| `canEdit()` | Проверка режима редактирования |
| `getCurrentLanguage()` | Текущий язык |
| `getLanguages()` | Список языков |
| `getKeynode(sys_idtf)` | Получить ключевой узел |
| `getIdentifier(addr, callback)` | Получить идентификатор |
| `updateContent()` | Обновить контент |
| `doDefaultCommand(args)` | Выполнить команду |
| `createViewersForScLinks(containers_map)` | Создать просмотрщики для sc-ссылок |
| `createViewersForScStructs(containers_map)` | Создать просмотрщики для структур |
| `translate()` | Применить перевод |

### События

| Событие | Описание |
|---------|----------|
| `eventDataAppend` | Данные получены |
| `eventGetObjectsToTranslate` | Получить объекты для перевода |
| `eventApplyTranslation` | Применить перевод |
| `eventStructUpdate` | Структура обновлена |
| `eventArgumentsUpdate` | Аргументы изменены |

---

## 5. Перевод (translation.js)

**Файл:** `client/js/Core/translation.js`

### Система перевода

```javascript
SCWeb.core.Translation = {
    // События
    // "translation/update" - обновление переводов
    // "translation/get" - получение объектов для перевода
    // "translation/changed_language" - язык изменён
    
    update: function () {
        // 1. Собрать объекты для перевода
        var objects = this.collectObjects();
        // 2. Перевести
        this.translate(objects).then(function (namesMap) {
            // 3. Уведомить подписчиков
            self.fireUpdate(namesMap);
        });
    },
    
    setLanguage: function (lang_addr, callback) {
        // Изменить язык и перевести всё
    }
};
```

---

## 6. Менеджер окон (windowmanager.js)

**Файл:** `client/js/Ui/windowmanager.js`

### Функции

- `appendHistoryItem(action_addr, command_state)` - добавить в историю
- `appendWindow(action_addr, command_state)` - создать окно
- `setWindowActive(id)` - активировать окно
- `createViewersForScLinks(containers_map)` - создать просмотрщики
- `updateTranslation(namesMap)` - обновить переводы

### Структура окна

```html
<div id="window-{id}" class="sc-window panel panel-default">
    <div class="panel-heading">
        <span sc_addr="{addr}">{identifier}</span>
    </div>
    <div class="panel-body sc-window-content">
        <!-- Контент компонента -->
    </div>
</div>
```

---

## 7. Меню (menu.js)

**Файл:** `client/js/Ui/menu.js`

### Генерация меню

```javascript
SCWeb.ui.Menu = {
    init: function (menu_container_id, menu_commands) {
        // Рекурсивная генерация меню из команды
    },
    
    _generateSubmenu: function (parent, commands) {
        // Создание подменю
    }
};
```

---

## 8. Утилиты SC (Utils)

### sc_types.js

Типы SC-элементов:

```javascript
sc_type_node           = 1
sc_type_link           = 2
sc_type_edge           = 4
sc_type_arc            = 8

sc_type_const          = 16
sc_type_var            = 32

sc_type_pos_arc        = 64
sc_type_neg_arc        = 128
sc_type_fuz_arc        = 256

sc_type_perm_arc       = 512
sc_type_temp_arc      = 1024

// и т.д.
```

### sc_helper.js

Методы для работы с SC-элементами:

```javascript
ScHelper.prototype = {
    getConnectorElements(arc),      // Получить элементы коннектора
    checkConnector(addr1, type, addr2), // Проверить связь
    getSetElements(addr),           // Получить элементы множества
    getMainMenuCommands(),          // Получить команды меню
    getLanguages(),                 // Получить языки
    getOutputLanguages()            // Получить языки вывода
};
```

### sc_keynodes.js

Работа с ключевыми узлами:

```javascript
ScKeynodes = function (helper) {
    this.known = {};      // Кэш известных узлов
    this.sys_idents = {}; // Системные идентификаторы
};

ScKeynodes.prototype = {
    init(),                // Инициализация
    resolve(keynode),     // Преобразование в адрес
    _onKeynode(),         // Обработка полученного ключевого узла
    isValid()             // Проверка валидности
};
```

---

## 9. Шаблоны (templates)

### base.html

```html
<body>
    <nav id="header">...</nav>           <!-- Шапка -->
    
    <div id="main-container">
        <div id="static-window-container">
            <div id="history-container">   <!-- История -->
                <ul id="history-items"></ul>
            </div>
        </div>
        
        <div id="window-container">        <!-- Окна -->
            <!-- Компоненты рендерятся сюда -->
        </div>
    </div>
    
    <div id="footer">
        <div id="arguments_container">     <!-- Аргументы -->
            <button id="arguments_clear_button">...</button>
            <div id="arguments_buttons"></div>
        </div>
    </div>
    
    <script>
        SCWeb.core.Main.init(params);
    </script>
</body>
```

---

## 10. Поток данных

```
1. Пользователь открывает страницу
       ↓
2. base.html загружает sc-web-core.js
       ↓
3. SCWeb.core.Main.init() - инициализация
       ↓
4. SCWeb.core.Server.init() - получение данных
       ↓
5. SCWeb.core.ComponentManager.init() - регистрация компонентов
       ↓
6. SCWeb.ui.WindowManager - создание окон
       ↓
7. Component factory - создание компонента
       ↓
8. Sandbox.updateContent() - получение контента
       ↓
9. Server.doCommand() - запрос к sc-server
       ↓
10. Получение данных → render
```

---

## 11. Событийная модель

### EventManager

```javascript
SCWeb.core.EventManager = {
    subscribe: function (event, context, callback) {
        // Подписка на событие
    },
    
    unsubscribe: function (listener) {
        // Отписка
    },
    
    emit: function (event, data) {
        // Испускание события
    }
};
```

### Основные события

| Событие | Описание |
|---------|----------|
| `translation/update` | Обновление переводов |
| `translation/get` | Запрос объектов для перевода |
| `translation/changed_language` | Изменение языка |
| `arguments/add` | Добавлен аргумент |
| `arguments/remove` | Удалён аргумент |
| `arguments/clear` | Очищены аргументы |
| `render/update` | Обновление рендера |
| `expert_mode_changed` | Изменён экспертный режим |

---

## 12. Конфигурация сборки (Gruntfile.js)

```javascript
concat: {
    webcore: {
        src: [
            "node_modules/ts-sc-client/build/sc.js",  // SC-клиент
            "client/js/Utils/*.js",                   // Утилиты
            "client/js/Core/*.js",                    // Ядро
            "client/js/Ui/*.js"                       // UI
        ],
        dest: "client/static/components/js/sc-web-core.js"
    }
}
```

---
