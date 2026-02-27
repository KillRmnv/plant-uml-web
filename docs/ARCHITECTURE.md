# PlantUML Web - Архитектура приложения

## Общее описание

PlantUML Web - это веб-приложение для визуального и текстового редактирования семантических графов в рамках системы OSTIS (Open Semantic Technology for Intelligent Systems).

## Структура директорий

```
static/
├── index.html              # Главная HTML страница
├── proxy_server.py        # Python прокси-сервер для API
├── components/            # Основные компоненты и библиотеки
│   ├── js/              # JavaScript компоненты
│   │   ├── sc-web-core.js    # Ядро SCWeb (sc-клиент, sc-keynodes, sc-helper)
│   │   ├── scg-content-searcher.js  # Поисковик для Distance Based режима
│   │   ├── scg/              # SCg редактор
│   │   │   ├── scg.js              # Главный класс редактора
│   │   │   ├── scg-scene.js         # Управление сценой
│   │   │   ├── scg-render.js       # Рендеринг (D3.js)
│   │   │   ├── scg-model-objects.js # Модели объектов (SCgObjectLevel, SCgObjectState)
│   │   │   ├── scg-alphabet.js      # Алфавит (типы узлов, дуг)
│   │   │   ├── scg-object-creator.js # Создание объектов
│   │   │   ├── scg-struct.js        # Работа со структурами
│   │   │   ├── scg-component.js     # Компонент редактора
│   │   │   ├── scg-ui.js            # UI элементы
│   │   │   ├── listener/            # Обработчики событий (select, connector, bus, contour, link)
│   │   │   ├── command/             # Команды редактора
│   │   ├── create-node   │   │.js
│   │   │   │   ├── create-connector.js
│   │   │   │   ├── create-bus.js
│   │   │   │   ├── create-contour.js
│   │   │   │   ├── create-link.js
│   │   │   │   ├── delete-objects.js
│   │   │   │   ├── move-object.js
│   │   │   │   └── ...
│   │   │   ├── gwf-*              # Работа с GWF форматом
│   │   │   └── ...
│   │   └── common/              # Внешние библиотеки
│   │       ├── jquery/          # jQuery 2.1.3
│   │       ├── bootstrap/       # Bootstrap 3
│   │       ├── kinetic/         # Kinetic.js (устарел, не используется)
│   │       ├── d3/             # D3.js для рендеринга
│   │       ├── typeahead/      # Autocomplete
│   │       ├── context/        # Context menu
│   │       └── highlight/      # Syntax highlighting
│   ├── css/                   # Стили SCg
│   ├── html/                  # HTML шаблоны
│   └── images/scg/            # Иконки инструментов
├── js/                    # Собственные JS модули приложения
│   ├── app.js               # Главный контроллер приложения
│   ├── config.js            # Конфигурация
│   ├── api/client.js        # API клиент
│   ├── editors/             # Менеджер редакторов
│   │   ├── editor-manager.js # Переключение между ScS и SCg
│   │   ├── scg-editor.js    # SCgEditor wrapper
│   │   └── scs-bundle/      # ScS язык для Monaco
│   ├── render/              # Рендеринг диаграмм
│   │   ├── strategy.js
│   │   ├── scs-render.js
│   │   ├── scg-render.js
│   │   └── factory.js
│   ├── panels/              # Система панелей
│   │   ├── panel-system.js
│   │   ├── resizable.js
│   │   └── collapsible.js
│   ├── assistant/           # AI ассистент
│   │   ├── panel.js
│   │   ├── chat-window.js
│   │   └── chat-list.js
│   └── settings/           # Настройки
│       └── modal.js
└── css/                    # Стили приложения
    ├── main.css
    ├── panels.css
    ├── editor.css
    ├── assistant.css
    └── settings.css
```

## Архитектура приложения

### 1. Слой представления (HTML/CSS)

**index.html** - главная страница содержит:
- Header с логотипом и кнопками
- Toolbar с выбором редактора (ScS/SCg) и действиями
- Panel Container - контейнер для редакторов и панелей
- Status Bar - статусная строка
- Footer с версией

### 2. JavaScript модули

#### app.js - Главный контроллер

```javascript
class App {
    init() {
        this.initApiClient();       // Инициализация API
        this.initPanelSystem();    // Система панелей
        this.initRenderFactory();  // Фабрика рендеринга
        this.initEditor();         // Редакторы
        this.initAssistant();      // AI ассистент
        this.initSettings();       // Настройки
        this.initSession();        // Сессия
    }
}
```

#### EditorManager - Управление редакторами

```javascript
class EditorManager {
    // Поддерживает два типа редакторов:
    // - scs: Текстовый редактор на Monaco
    // - scg: Графический редактор
    
    switchTo(type) {
        // Скрывает текущий редактор
        // Показывает выбранный
        // Инициализирует при первом переключении
    }
}
```

#### SCgEditor - Обертка для SCg редактора

```javascript
class SCgEditor {
    // Основные методы:
    // - init(): Инициализация SCg редактора
    // - _initSearcher(): Инициализация поисковика
    // - _setupDoubleClickHandler(): Обработка двойного клика
    // - _handleStructUpdate(): Добавление элементов на сцену
    // - getValue/setValue(): Работа с GWF
    
    // Взаимодействие с SCg:
    // - editor.scene - сцена
    // - editor.render - рендерер
    // - sandbox.updateContent() - запуск поиска
}
```

### 3. SCg Редактор (Копия из sc-web)

#### Core классы

| Класс | Назначение |
|-------|------------|
| `SCg` | Главный класс редактора |
| `SCgScene` | Управление сценой (nodes, connectors, links, contours, buses) |
| `SCgRender` | Рендеринг через D3.js |
| `SCgObjectCreator` | Создание объектов (узлы, дуги, ссылки, контуры, шины) |
| `SCgAlphabet` | Определение типов и стилей |
| `CommandManager` | Менеджер команд (undo/redo) |

#### Модели объектов (scg-model-objects.js)

```javascript
// Уровни (Distance Based)
const SCgObjectLevel = {
    First: 0,    // Кликнутый узел
    Second: 1,   // Связанные напрямую
    Third: 2,
    Fourth: 3,
    Fifth: 4,
    Sixth: 5,
    Seventh: 6,  // Максимум
    Count: 7
};

// Состояния
const SCgObjectState = {
    Normal: 0,
    MergedWithMemory: 1,
    NewInMemory: 2,
    FromMemory: 3,
    RemovedFromMemory: 4
};
```

#### Типы объектов SCg

- **SCg.ModelNode** - узел
- **SCg.ModelConnector** - дуга (common, membership)
- **SCg.ModelLink** - ссылка
- **SCg.ModelContour** - контур
- **SCg.ModelBus** - шина

### 4. Поиск (DistanceBasedSCgSearcher)

#### Алгоритм поиска при двойном клике

```
1. Пользователь делает dblclick на узел
      ↓
2. scg-render.js вызывает sandbox.updateContent(sc.Addr)
      ↓
3. SCgEditor._updateContent() очищает сцену
      ↓
4. searcher.searchContent([keyElement])
      ↓
5. searchFromKeyElements() - поиск от ключевых элементов
      ↓
6. searchAllLevelConnectors() - рекурсивный поиск по уровням
      ↓
7. eventStructUpdate() - добавление на сцену
      ↓
8. SCgObjectCreator.create() → scene.appendObject()
```

#### Ключевые функции поиска

| Функция | Назначение |
|---------|------------|
| `searchContent()` | Главная точка входа |
| `searchFromKeyElements()` | Поиск от указанных элементов |
| `searchAllLevelConnectors()` | Рекурсивный поиск по уровням |
| `searchLevelNodeConnectors()` | Поиск коннекторов узла |
| `searchLevelConnectorsByDirection()` | Поиск входящих/исходящих дуг |
| `searchLevelConnectorElements()` | Обработка коннекторов |

### 5. Внешние зависимости

#### SC-Web Core (sc-web-core.js)

```javascript
// Определения типов sc-элементов
const sc_type_node = 0x1;
const sc_type_connector = 0x4000;
// ...

// WebSocket клиент для sc-machine
window.scClient

// Helper для работы с базой знаний
window.scHelper
window.scKeynodes

// Основные компоненты
SCWeb.core.Main       // Главный контроллер
SCWeb.core.Server     // Коммуникация с сервером
SCWeb.core.ComponentManager  // Управление компонентами
```

#### D3.js (scg-render.js)

Используется для рендеринга SVG:
- Узлы: `svg:g` с вложенными элементами
- Дуги: `svg:path`
- Ссылки: `svg:rect` + `svg:foreignObject`
- Контуры: `svg:path`

## Поток данных при инициализации

```
index.html загружается
       ↓
1. Загрузка внешних библиотек (jQuery, D3, Bootstrap)
       ↓
2. serverHost = 'ws://localhost:8090/ws_json'
       ↓
3. Загрузка sc-web-core.js
       ↓
   a. Создание window.scClient (WebSocket)
   b. Инициализация window.scHelper
   c. Инициализация window.scKeynodes
       ↓
4. Загрузка SCg компонентов (scg.js → scg-scene.js → ...)
       ↓
5. Инициализация приложения (app.js)
       ↓
   a. PanelSystem - создание панелей
   b. EditorManager - создание редакторов
   c. При первом переключении на SCg:
      - Создание SCgEditor
      - Инициализация DistanceBasedSCgSearcher
      - Подготовка sandbox
       ↓
6. Приложение готово к работе
```

## Поток данных при двойном клике

```
Пользователь: dblclick на узел
       ↓
scg-render.js: onDblClick()
       ↓
Проверка: SCWeb.core.Main.viewMode === DistanceBasedSCgView
       ↓
sandbox.updateContent(new sc.ScAddr(d.sc_addr))
       ↓
SCgEditor._updateContent(keyElement)
       ↓
1. sandbox.addr = keyElement
2. _clearScene() - очистка сцены
3. searcher.searchContent([keyElement])
       ↓
searchContent():
   - searchFromKeyElements([keyElement])
       ↓
   - getElementsTypes() - получить типы
       ↓
   - eventStructUpdate() - добавить узел
       ↓
   - searchAllLevelConnectors() - найти связанные
       ↓
   - для каждого связанного:
       - searchLevelNodeConnectors()
       - searchLevelConnectorsByDirection()
       - eventStructUpdate()
       ↓
_handleStructUpdate() в SCgEditor
       ↓
Проверка: scene.getObjectByScAddr(addr)
       ↓
Если нет - создание объекта:
   SCgObjectCreator.create(config)
       ↓
scene.appendObject(obj)
       ↓
scene.layout() - перерасчет позиций
       ↓
render.update() - перерисовка
```

## Конфигурация (config.js)

```javascript
const Config = {
    EDITOR: {
        DEFAULT_TYPE: 'scs',  // 'scs' или 'scg'
    },
    RENDER: {
        DEFAULT_FORMAT: 'png',
    },
    STORAGE_KEYS: {
        SESSION: 'plantuml-web-session',
    },
    API: {
        ENDPOINT: '/api/',
    },
    PANELS: {
        // Позиции и размеры панелей
    },
};
```

## API клиент (api/client.js)

```javascript
class ApiClient {
    // Методы для работы с бэкендом
    // - render(content, format)
    // - save(content)
    // - load()
}
```

## Система панелей (panel-system.js)

```
┌─────────────────────────────────────────────────────┐
│ Header                                                │
├──────────────┬──────────────────┬──────────────────┤
│ Editor       │ Image Preview     │ Assistant         │
│ (ScS/SCg)    │ (PNG result)     │ (AI Chat)         │
│              │                  │                   │
├──────────────┴──────────────────┴──────────────────┤
│ Status Bar                                            │
└─────────────────────────────────────────────────────┘
```

Панели могут быть:
- Resizable (изменяемый размер)
- Collapsible (скрываемые)
- Перетаскиваемые

## Команды редактора (Command pattern)

```javascript
class CommandManager {
    execute(command) {
        this.history.push(command);
        command.execute();
        this.redoStack = [];
    }
    
    undo() {
        const cmd = this.history.pop();
        cmd.undo();
        this.redoStack.push(cmd);
    }
    
    redo() {
        const cmd = this.redoStack.pop();
        cmd.execute();
        this.history.push(cmd);
    }
}
```

Доступные команды:
- CreateNodeCommand
- CreateConnectorCommand
- CreateBusCommand
- CreateContourCommand
- CreateLinkCommand
- DeleteObjectsCommand
- MoveObjectCommand
- ChangeIdtfCommand
- ChangeTypeCommand
- ChangeContentCommand

## Зависимости от SC-машины

Приложение требует запущенную **sc-machine**:

```javascript
// WebSocket URL
var serverHost = 'ws://localhost:8090/ws_json';

// Подключение автоматически устанавливается в sc-web-core.js
window.scClient.connect(serverHost);
```

### Основные операции sc-client

```javascript
// Поиск по шаблону
scClient.searchByTemplate(scTemplate)

// Получение типов элементов
scClient.getElementsTypes([addr1, addr2, ...])

// Создание элементов
scClient.createNode(scType, addr)
scClient.createEdge(scType, sourceAddr, targetAddr)
scClient.createLink(scType, content)

// Подписка на события
scClient.createElementaryEventSubscription(params)

// Работа с ключевыми узлами
scKeynodes.resolve(idtf)
```

## Proxy Server (proxy_server.py)

```python
# Проксирует HTTP запросы с localhost:8888 на localhost:8889
# Используется для API вызовов
# WebSocket работает напрямую из браузера
```

## Кнопки тулбара

| Кнопка | Действие |
|--------|----------|
| ScS | Переключить на текстовый редактор |
| SCg | Переключить на графический редактор |
| Render | Отрендерить диаграмму |
| Save | Сохранить сессию в localStorage |
| Clear | Очистить редактор |

## Клавиши

| Клавиша | Действие |
|---------|----------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Удалить выделенные |
| Ctrl+A | Выделить все |
| Escape | Отменить выбор |
| DblClick | Поиск окрестности (DistanceBased) |

## Режимы редактирования SCg

```javascript
const SCgEditMode = {
    SCgModeSelect: 0,      // Выделение и перемещение
    SCgModeConnector: 1,   // Создание дуг
    SCgModeBus: 2,         // Создание шин
    SCgModeContour: 3,     // Создание контуров
    SCgModeLink: 4,        // Создание ссылок
    SCgViewOnly: 5         // Только просмотр
};

const SCgViewMode = {
    DefaultSCgView: 0,           // Стандартный
    DistanceBasedSCgView: 1      // Поуровневый
};
```

## Заключение

PlantUML Web представляет собой сложное веб-приложение, интегрирующее:
1. **SCg редактор** - графическое редактирование семантических графов
2. **ScS редактор** - текстовое редактирование на языке SCs
3. **AI ассистент** - помощь в написании кода
4. **Систему рендеринга** - генерация изображений из кода
5. **Интеграцию с OSTIS** - работа с базой знаний через sc-machine

Ключевая особенность - использование компонентов из внешнего проекта sc-web с собственной системой панелей и UI.
