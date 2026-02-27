# SCg Editor - Архитектура и точка входа

## 1. Точка входа

### 1.1 HTML уровень

```
index.html → components/scg/scg.html
```

**index.html** (`external/sc-web/index.html:8-9`):
```html
<body onload="document.getElementById('scg').click();">
    <a href='components/scg/scg.html' id='scg'>link to scg</a>
```

Простой редирект на основной компонент.

**scg.html** (`components/scg/scg.html:133-169`):
```javascript
$(document).ready(function() {
    var sandbox = {
        container: "scg-viewer",
        addr: 0,
        is_struct: false,
        format_addr: "format_scg_json",
    };

    var editor = new SCg.Editor();
    editor.init({
        sandbox: sandbox,
        containerId: "scg-viewer",
        canEdit: true,
    });

    editor.render.update();
    editor.scene.layout();
});

<div class="scg-viewer" id="scg-viewer"></div>
```

### 1.2 Порядок загрузки скриптов (scg.html:57-132)

1. **Внешние библиотеки:**
   - jQuery 2.1.3
   - Bootstrap
   - Kinetic.js (canvas рендеринг)
   - D3.js
   - и др.

2. **SCg исходники:**
   - GWF файлы (gwf-*.js)
   - scg-object-builder.js
   - scg.js - **главный класс**
   - scg-model-objects.js - модели элементов
   - scg-alphabet.js - типы
   - scg-render.js - рендеринг
   - scg-scene.js - сцена
   - Listener-ы (scg-mode-*.js)
   - Команды (command/*.js)

---

## 2. Где создаются элементы

### 2.1 Главный класс - SCg.Editor

**Файл:** `components/scg/src/scg.js`

```javascript
SCg.Editor = function () {
    this.render = null;
    this.scene = null;
};

SCg.Editor.prototype.init = function (params) {
    this.render = new SCg.Render();
    this.scene = new SCg.Scene({ render, edit });
    this.render.init(params);
    this.initUI();  // инициализация UI
};
```

**Инициализация UI (scg.js:98-195):**
- Загружается панель инструментов `scg-tools-panel.html`
- Загружаются панели типов (nodes, links, connectors)
- Привязываются обработчики событий к кнопкам

### 2.2 Модели объектов

**Файл:** `components/scg/src/scg-model-objects.js`

```javascript
// Базовый класс
SCg.ModelObject = function (options) {
    this.position = options.position || new SCg.Vector3(0, 0, 0);
    this.scale = options.scale || new SCg.Vector2(20, 20);
    this.sc_type = options.sc_type || sc_type_node;
    this.text = options.text || null;
    this.id = ObjectId++;
};

// Узел
SCg.ModelNode = function (options) {
    SCg.ModelObject.call(this, options);
};

// Ссылка (контент)
SCg.ModelLink = function (options) {
    SCg.ModelObject.call(this, options);
    this.content = options.content;
};

// Коннектор (связь между узлами)
SCg.ModelConnector = function (options) {
    SCg.ModelObject.call(this, options);
    this.source = options.source;
    this.target = options.target;
};

// Контур
SCg.ModelContour = function (options) {
    SCg.ModelObject.call(this, options);
    this.childs = [];
    this.points = options.verticies;
};

// Шина
SCg.ModelBus = function (options) {
    SCg.ModelObject.call(this, options);
    this.source = options.source;
};
```

### 2.3 Фабрика объектов

**Файл:** `components/scg/src/scg-object-creator.js`

```javascript
SCg.Creator = {};

SCg.Creator.generateNode = function (sc_type, pos, text) {
    return new SCg.ModelNode({
        position: pos.clone(),
        scale: new SCg.Vector2(20, 20),
        sc_type: sc_type,
        text: text
    });
};

SCg.Creator.generateConnector = function (source, target, sc_type) {
    return new SCg.ModelConnector({
        source: source,
        target: target,
        sc_type: sc_type
    });
};

SCg.Creator.generateLink = function (sc_type, pos, containerId, text) {
    return new SCg.ModelLink({...});
};

SCg.Creator.createBus = function (source) {
    return new SCg.ModelBus({ source: source });
};

SCg.Creator.createCounter = function (polygon) {
    return new SCg.ModelContour({ verticies: polygon });
};
```

---

## 3. Где привязывается логика

### 3.1 Сцена (SCg.Scene)

**Файл:** `components/scg/src/scg-scene.js`

```javascript
SCg.Scene = function (options) {
    this.listener_array = [
        new SCgSelectListener(this),      // режим выделения
        new SCgConnectorListener(this),   // создание связей
        new SCgBusListener(this),         // создание шин
        new SCgContourListener(this),     // создание контуров
        new SCgLinkListener(this)         // создание ссылок
    ];
    this.listener = this.listener_array[0];
    this.commandManager = new SCgCommandManager();
    
    this.nodes = [];
    this.links = [];
    this.connectors = [];
    this.contours = [];
    this.buses = [];
    
    this.edit_mode = SCgEditMode.SCgModeSelect;
};
```

**Основные методы:**
- `appendNode(node)` - добавить узел
- `appendConnector(connector)` - добавить связь
- `setEditMode(mode)` - изменить режим редактирования
- `deleteObjects(objects)` - удалить объекты

### 3.2 Listener-ы (режимы редактирования)

**Папка:** `components/scg/src/listener/`

| Файл | Режим | Описание |
|------|-------|----------|
| `scg-mode-select.js` | Select | Выделение, перемещение |
| `scg-mode-connector.js` | Connector | Рисование связей между узлами |
| `scg-mode-bus.js` | Bus | Рисование шин |
| `scg-mode-contour.js` | Contour | Создание контуров |
| `scg-mode-link.js` | Link | Создание ссылок |

### 3.3 Команды (Command Pattern)

**Папка:** `components/scg/src/command/`

| Файл | Команда |
|------|---------|
| `create-node.js` | Создание узла |
| `create-connector.js` | Создание связи |
| `create-bus.js` | Создание шины |
| `create-contour.js` | Создание контура |
| `create-link.js` | Создание ссылки |
| `change-idtf.js` | Изменение идентификатора |
| `change-type.js` | Изменение типа |
| `change-content.js` | Изменение контента |
| `delete-objects.js` | Удаление объектов |
| `move-object.js` | Перемещение объекта |

**Пример - создание узла** (`command/create-node.js`):
```javascript
SCgCommandCreateNode = function (x, y, scene) {
    this.x = x;
    this.y = y;
    this.scene = scene;
};

SCgCommandCreateNode.prototype.execute = function () {
    if (this.node == null) {
        this.node = SCg.Creator.generateNode(
            SCgTypeNodeNow, 
            new SCg.Vector3(this.x, this.y, 0), 
            ''
        );
        this.scene.appendNode(this.node);
    }
};

SCgCommandCreateNode.prototype.undo = function () {
    this.scene.removeObject(this.node);
};
```

### 3.4 Command Manager

**Файл:** `command/command-manager.js`

```javascript
SCgCommandManager = function () {
    this.commands = [];
    this.current = -1;
};

SCgCommandManager.prototype.execute = function (command) {
    command.execute();
    this.commands.push(command);
    this.current++;
};

SCgCommandManager.prototype.undo = function () {
    if (this.current >= 0) {
        this.commands[this.current].undo();
        this.current--;
    }
};

SCgCommandManager.prototype.redo = function () {
    if (this.current < this.commands.length - 1) {
        this.current++;
        this.commands[this.current].execute();
    }
};
```

---

## 4. UI - Панель инструментов

**Файл:** `components/scg/static/components/html/scg-tools-panel.html`

```html
<div class="scg-tools-panel">
    <label id="scg-tool-switch">Режим просмотра/редактирования</label>
    <label id="scg-tool-select">Выделение</label>
    <label id="scg-tool-connector">Связь</label>
    <label id="scg-tool-bus">Шина</label>
    <label id="scg-tool-contour">Контур</label>
    <label id="scg-tool-link">Ссылка</label>
    <label id="scg-tool-undo">Отмена</label>
    <label id="scg-tool-redo">Повтор</label>
    <label id="scg-tool-change-idtf">Изменить идентификатор</label>
    <label id="scg-tool-change-type">Изменить тип</label>
    <label id="scg-tool-delete">Удалить</label>
    <label id="scg-tool-open">Открыть файл</label>
    <label id="scg-tool-save">Сохранить файл</label>
    <label id="scg-tool-clear">Очистить</label>
    <label id="scg-tool-integrate">Интегрировать в БЗ</label>
    <label id="scg-tool-zoomin">Увеличить</label>
    <label id="scg-tool-zoomout">Уменьшить</label>
    <label id="scg-tool-autosize">Авторазмер</label>
</div>
```

### Привязка событий (scg.js:292-921)

```javascript
bindToolEvents: function () {
    // Выбор режима
    this.toolSelect().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeSelect);
    });
    
    // Создание связи
    this.toolConnector().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeConnector);
    });
    
    // Создание узла (через listener)
    this.toolUndo().click(function () {
        self.scene.commandManager.undo();
    });
    
    // и т.д.
}
```

---

## 5. Поток данных при создании элемента

```
1. Пользователь кликает на canvas (scg-render.js обрабатывает клики)
      ↓
2. Вызывается listener, соответствующий текущему режиму:
   - SCgConnectorListener (для режима Connector)
      ↓
3. В listener создается команда:
   new SCgCommandCreateConnector(x, y, scene)
      ↓
4. CommandManager выполняет команду:
   commandManager.execute(new SCgCommandCreateConnector(...))
      ↓
5. Выполняется create:
   this.node = SCg.Creator.generateNode(type, position, text)
   scene.appendNode(node)
      ↓
6. Рендеринг:
   render.update() → scg-render.js отрисовывает элемент на canvas
```

---

## 6. Рендеринг

**Файл:** `components/scg/src/scg-render.js`

Отвечает за отрисовку на Kinetic.js canvas:
- Отрисовка узлов, связей, контуров, шин
- Обработка масштабирования, перемещения
- Подсветка выделенных элементов

---

## 7. Компонентная интеграция

**Файл:** `components/scg/src/scg-component.js`

```javascript
SCgComponent = {
    ext_lang: 'scg_code',
    formats: ['format_scg_json'],
    struct_support: true,
    factory: function (sandbox) {
        return new SCgViewerWindow(sandbox);
    }
};

const SCgViewerWindow = function (sandbox) {
    this.editor = new SCg.Editor();
    this.editor.init({ sandbox, containerId: sandbox.container, ... });
    
    this.sandbox.eventDataAppend = $.proxy(this.receiveData, this);
    this.sandbox.updateContent();
};
```

Это интеграция с системой компонентов sc-web для отображения графов из памяти.

---

## 8. Сводка по ключевым файлам

| Файл | Назначение |
|------|------------|
| `scg.html` | HTML точка входа |
| `scg.js` | Главный класс редактора, инициализация UI |
| `scg-scene.js` | Управление сценой и объектами |
| `scg-model-objects.js` | Модели данных (Node, Link, Connector, Contour, Bus) |
| `scg-object-creator.js` | Фабрика для создания объектов |
| `scg-render.js` | Отрисовка на Kinetic.js |
| `listener/*.js` | Режимы редактирования |
| `command/*.js` | Команды (создание, удаление, изменение) |
| `command-manager.js` | Менеджер команд (undo/redo) |
| `scg-tools-panel.html` | UI панель инструментов |
