# Создание редактора SCg и подписка на события

Документация описывает процесс создания редактора SCg, инициализации панелей инструментов и подписки на события в системе SCWeb.

---

## 1. EditorManager - Создание редактора

**Файл:** `static/js/editors/editor-manager.js`

Класс `EditorManager` управляет созданием и переключением между редакторами ScS и SCg.

### Инициализация SCg редактора (строки 221-384)

```javascript
_initScgEditor(container) {
    // Создание sandbox объекта с callback-ами
    const sandbox = {
        container: 'scg-viewer',
        addr: new sc.ScAddr(),
        is_struct: true,
        format_addr: 'format_scg_json',
        eventStructUpdate: null,
        layout: (scene) => { ... },
        postLayout: (scene) => { ... },
        resolveElementsAddr: async (identifiers) => { ... },
        canEdit: () => true,
        createViewersForScLinks: (links) => {},
        getIdentifier: function (addr, callback) { ... },
        updateContent: async (keyElement) => { ... },
    };

    // Создание и инициализация редактора
    const editor = new SCg.Editor();
    editor.init({
        containerId: 'scg-viewer',
        canEdit: true,
        sandbox: sandbox,
        autocompletionVariants: (keyword, callback) => { callback([]); },
        translateToSc: (callback) => { callback({}); },
    });

    window.scgEditor = editor;
}
```

### Подписка на keyboard события (строки 325-335)

```javascript
// Подписка на keydown
document.addEventListener('keydown', (e) => {
    if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
        window.scgEditor.keyboardCallbacks.onkeydown(e);
    }
});

// Подписка на keyup
document.addEventListener('keyup', (e) => {
    if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
        window.scgEditor.keyboardCallbacks.onkeyup(e);
    }
});
```

---

## 2. SCg.Editor - Инициализация UI и панелей

**Файл:** `external/sc-web/components/scg/src/scg.js`

### Метод init (строки 14-93)

```javascript
init: function (params) {
    // Создание рендера и сцены
    this.render = new SCg.Render();
    this.scene = new SCg.Scene({ render: this.render, edit: this });
    this.scene.init();

    this.render.sandbox = params.sandbox;
    this.render.sandbox.scene = this.render.scene;
    this.render.init(params);

    this.canEdit = !!params.canEdit;
    this.initUI();

    // Подписка на событие обновления рендера
    SCWeb.core.EventManager.subscribe("render/update", null, () => {
        this.scene.updateRender();
        this.scene.updateLinkVisual();
    });
}
```

### Метод initUI (строки 98-195)

Инициализация пользовательского интерфейса и загрузка панелей инструментов.

```javascript
initUI: function () {
    var self = this;
    var container = '#' + this.containerId;
    
    // Создание контейнера для инструментов
    $(container).prepend('<div id="tools-' + this.containerId + '"></div>');
    var tools_container = '#tools-' + this.containerId;
    
    // Загрузка HTML панели инструментов
    $(tools_container).load('static/components/html/scg-tools-panel.html', function () {
        // Загрузка панелей типов узлов, связей и коннекторов
        $.ajax({ url: "static/components/html/scg-types-panel-nodes.html", ... });
        $.ajax({ url: "static/components/html/scg-types-panel-links.html", ... });
        $.ajax({ url: "static/components/html/scg-types-panel-connectors.html", ... });
        $.ajax({ url: 'static/components/html/scg-delete-panel.html', ... });
        
        // После загрузки всех панелей - привязка событий
        self.bindToolEvents();
    });
    
    // Установка режима редактирования
    this.scene.setEditMode(SCWeb.core.Main.editMode);
    
    // Подписки на события сцены
    this.scene.event_selection_changed = function () { self.onSelectionChanged(); };
    this.scene.event_modal_changed = function () { self.onModalChanged(); };
    
    // Объект keyboardCallbacks для подписки через KeyboardHandler
    this.keyboardCallbacks = {
        'onkeydown': function (event) { self.scene.onKeyDown(event) },
        'onkeyup': function (event) { self.scene.onKeyUp(event); }
    };
    
    this.openComponentCallbacks = function () {
        self.render.requestUpdateAll();
    }
}
```

### Метод bindToolEvents (строки 292-500+)

Привязка обработчиков событий к кнопкам панелей инструментов.

```javascript
bindToolEvents: function () {
    var self = this;
    var select = this.toolSelect();
    select.button('toggle');

    // Обработчик переключения режима (редактирование/просмотр)
    this.toolSwitch().click(function () {
        self.canEdit = !self.canEdit;
        // Переключение видимости инструментов
    });

    // Выбор (Select)
    select.click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeSelect);
    });

    // Двойной клик - выбор типа узла
    select.dblclick(function () {
        self.scene.setModal(SCgModalMode.SCgModalType);
        // Показ popover с типами узлов
    });

    // Инструмент связывания (Connector)
    this.toolConnector().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeConnector);
    });

    // Инструмент шины (Bus)
    this.toolBus().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeBus);
    });

    // Инструмент контура (Contour)
    this.toolContour().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeContour);
    });

    // Инструмент ссылки (Link)
    this.toolLink().click(function () {
        self.scene.setEditMode(SCgEditMode.SCgModeLink);
    });

    // Отмена (Undo)
    this.toolUndo().click(function () {
        self.scene.undo();
    });

    // Повтор (Redo)
    this.toolRedo().click(function () {
        self.scene.redo();
    });

    // Удаление
    this.toolDelete().click(function () {
        self.scene.deleteSelected();
    });

    // Очистка
    this.toolClear().click(function () {
        self.scene.clear();
    });

    // Открытие файла
    this.toolOpen().click(function () { ... });

    // Сохранение
    this.toolSave().click(function () { ... });

    // Авторазмер
    this.toolAutosize().click(function () {
        self.scene.layout();
    });

    // Масштабирование
    this.toolZoomIn().click(function () { self.scene.zoomIn(); });
    this.toolZoomOut().click(function () { self.scene.zoomOut(); });
}
```

---

## 3. ComponentManager - Подписка компонентов

**Файл:** `external/sc-web/client/js/Core/componentmanger.js`

При создании окна компонента происходит подписка на keyboard и open события (строки 129-136):

```javascript
createWindowSandboxByFormat: function (options) {
    return new Promise((resolve, reject) => {
        const comp_def = this._factories_fmt[options.format_addr];
        if (comp_def) {
            // Создание sandbox
            const sandbox = new SCWeb.core.ComponentSandbox({ ... });

            // Вызов фабрики компонента
            const component = comp_def.factory(sandbox);

            // Подписка keyboard callbacks
            if (component.editor) {
                if (component.editor.keyboardCallbacks) {
                    SCWeb.ui.KeyboardHandler.subscribeWindow(
                        options.window_id, 
                        component.editor.keyboardCallbacks
                    );
                }
                // Подписка open callbacks
                if (component.editor.openComponentCallbacks) {
                    SCWeb.ui.OpenComponentHandler.subscribeComponent(
                        options.window_id, 
                        component.editor.openComponentCallbacks
                    );
                }
            }
        }
    });
}
```

---

## 4. KeyboardHandler - Обработка клавиатуры

**Файл:** `external/sc-web/client/js/Ui/KeyboardHandler.js`

Глобальный обработчик клавиатурных событий.

### Инициализация (строки 8-21)

```javascript
init: function () {
    var self = this;
    $(window)
        .on('keydown', function (d3_event) {
            self.emit('onkeydown', d3_event);
        })
        .on('keyup', function (d3_event) {
            self.emit('onkeyup', d3_event);
        })
        .on('keypress', function (d3_event) {
            self.emit('onkeypress', d3_event);
        });
}
```

### Подписка на события окна (строки 52-62)

```javascript
subscribeWindow: function (window_id, callbackArray) {
    for (var eventType in callbackArray) {
        var func = callbackArray[eventType];
        if (typeof func !== typeof function () {}) {
            continue;
        }
        this.subscribe(eventType, window_id, func);
    }
}
```

### Emit событий (строки 77-85)

```javascript
emit: function (eventType, d3_event) {
    var windowId = SCWeb.ui.WindowManager.getActiveWindowId();
    if (!this.events[eventType] || !this.events[eventType][windowId])
        return;
    var callBack = this.events[eventType][windowId].func;
    if (callBack) {
        callBack(d3_event);
    }
}
```

---

## 5. Панель инструментов SCg

**Файл:** `external/sc-web/components/scg/static/components/html/scg-tools-panel.html`

HTML-разметка панели инструментов с кнопками:

| ID кнопки | Описание | Функция |
|-----------|----------|---------|
| `scg-tool-switch` | Переключение режима | Редактирование/Просмотр |
| `scg-tool-select` | Выбор элементов | Выделение и манипуляция |
| `scg-tool-connector` | Связывание | Создание дуг |
| `scg-tool-bus` | Шина | Создание шин |
| `scg-tool-contour` | Контур | Создание контуров |
| `scg-tool-link` | Ссылка | Создание ссылок |
| `scg-tool-undo` | Отмена | Undo |
| `scg-tool-redo` | Повтор | Redo |
| `scg-tool-change-idtf` | Изменить идентификатор | Изменение idtf |
| `scg-tool-set-content` | Установить содержимое | Изменение контента ссылок |
| `scg-tool-change-type` | Изменить тип | Изменение типа элемента |
| `scg-tool-delete` | Удалить | Удаление элементов |
| `scg-tool-autosize` | Авторазмер | Автоматическая раскладка |
| `scg-tool-zoomin` | Увеличить | Zoom in |
| `scg-tool-zoomout` | Уменьшить | Zoom out |
| `scg-tool-integrate` | Интегрировать | Интеграция элементов |
| `scg-tool-open` | Открыть | Загрузка из файла |
| `scg-tool-save` | Сохранить | Сохранение в файл |
| `scg-tool-clear` | Очистить | Очистка сцены |

---

## Схема потока событий

```
Пользователь нажимает клавишу
         │
         ▼
document.addEventListener('keydown')
         │
         ▼
SCg.Editor.keyboardCallbacks.onkeydown(e)
         │
         ▼
SCg.Scene.onKeyDown(event)
         │
         ▼
Выполнение действия (удаление, отмена, и т.д.)
```

## Схема инициализации

```
EditorManager._initScgEditor()
         │
         ├── 1. Создание sandbox объекта
         │
         ├── 2. new SCg.Editor()
         │
         ├── 3. editor.init({...})
         │         │
         │         ├── Создание SCg.Render
         │         ├── Создание SCg.Scene
         │         │
         │         └── initUI()
         │                 │
         │                 ├── Загрузка scg-tools-panel.html
         │                 ├── Загрузка панелей типов
         │                 │
         │                 └── bindToolEvents()
         │                         │
         │                         └── Привязка click/dblclick обработчиков
         │
         └── 4. Подписка на keyboard events
                 │
                 └── document.addEventListener('keydown/keyup')
```
