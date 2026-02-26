# Взаимодействие поиска и редактора SCg

Документация описывает механизм поиска элементов в базе знаний и их отображения на сцене SCg-редактора. Все компоненты находятся в директории `external/sc-web`.

---

## 1. Общая схема взаимодействия

```
SC-сервер (scClient)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Поисковики (scg-content-searcher.js)                       │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ DefaultSCgSearcher│  │DistanceBasedSCg │                │
│  │                  │  │Searcher         │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      │                                       │
│                      ▼                                       │
│           sandbox.eventStructUpdate(data)                    │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SCgComponent (scg-component.js)                            │
│                                                              │
│  this.sandbox.eventStructUpdate = function(data) {         │
│      self.scStructTranslator.updateFromSc(data)            │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SCgStructTranslator (scg-struct.js)                       │
│                                                              │
│  fromScTranslator.update(data)                              │
│      │                                                      │
│      ├── generateNode() / generateLink() / generateConn() │
│      └── appendObjectToScene()                             │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SCg.Scene (scg-scene.js)                                  │
│                                                              │
│  scene.appendNode(node)                                     │
│  scene.appendConnector(connector)                          │
│  scene.appendLink(link)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Поисковики (scg-content-searcher.js)

**Файл:** `external/sc-web/client/js/Core/scg-content-searcher.js`

### 2.1 DefaultSCgSearcher

Простой поисковик, который находит все элементы структуры с ограничением.

#### Конструктор

```javascript
SCWeb.core.DefaultSCgSearcher = function (sandbox) {
    let self = this;
    this.maxSCgTriplesNumber = 300;  // Максимум триплов

    // Функции раскладки сцены
    sandbox.layout = (scene) => scene.layout();
    sandbox.postLayout = (scene) => scene.updateRender();
    
    // ... внутренние функции
};
```

#### Параметры конструктора

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sandbox` | `Object` | Sandbox-объект с настройками и callback-ами |

#### Возвращаемые методы

```javascript
return {
    searchContent: async function () {
        // Поиск элементов структуры
        const status = await searchStructureElements(true);  // С фильтрацией
        if (status) return status;
        return await searchStructureElements(false);          // Без фильтрации
    },

    initAppendRemoveElementsUpdate: async function () { ... },
    destroyAppendRemoveElementsUpdate: async function () { ... },
};
```

#### Метод searchContent()

Выполняет поиск элементов структуры.

**Параметры:** нет

**Возвращает:** `Promise<boolean>` - true если найдены элементы

---

### 2.2 DistanceBasedSCgSearcher

Поисковик на основе расстояния - иерархический поиск от ключевых элементов.

#### Конструктор

```javascript
SCWeb.core.DistanceBasedSCgSearcher = function (sandbox) {
    let self = this;
    this.generateArcEvent = null;
    this.eraseArcEvent = null;
    this.newElements = [];
    this.appendUpdateDelayTime = 200;  // Задержка для debounce
};
```

#### Параметры конструктора

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sandbox` | `Object` | Sandbox-объект |

#### Возвращаемые методы

```javascript
return {
    searchContent: async function (keyElements) {
        // keyElements - массив ключевых элементов для начала поиска
        sandbox.layout = (scene) => keyElements ? scene.updateRender() : scene.layout();
        sandbox.postLayout = (scene) => keyElements ? scene.layout() : scene.updateRender();
        
        let status = false;
        let structureElements = await searchAllElements();
        while (structureElements.size) {
            const visitedElements = await searchFromKeyElements(keyElements);
            // ... обход по уровням
        }
        return status;
    },
    initAppendRemoveElementsUpdate: async function () { ... },
    destroyAppendRemoveElementsUpdate: async function () { ... },
};
```

#### Параметры searchContent

| Параметр | Тип | Описание |
|----------|-----|----------|
| `keyElements` | `Array<sc.ScAddr>` | Массив ключевых элементов для начала поиска (опционально) |

---

### 2.3 SCgLinkContentSearcher

Поисковик для sc-ссылок.

#### Конструктор

```javascript
SCWeb.core.SCgLinkContentSearcher = function (sandbox, linkAddr) {
    this.contentBucket = [];           // Буфер для ссылок
    this.contentBucketSize = 20;       // Максимальный размер буфера
    this.appendContentTimeoutId = 0;
    this.appendContentTimeout = 2;     // Таймаут в мс
};
```

#### Параметры конструктора

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sandbox` | `Object` | Sandbox-объект |
| `linkAddr` | `sc.ScAddr` | Адрес ссылки для поиска |

---

## 3. Метод eventStructUpdate - Callback поисковика

Поисковик вызывает `sandbox.eventStructUpdate(data)` для каждого найденного элемента.

### Параметры data

| Поле | Тип | Описание |
|------|-----|----------|
| `sceneElement` | `sc.ScAddr` | sc-адрес элемента |
| `sceneElementType` | `sc.ScType` | Тип элемента (опционально, может быть получено позже) |
| `sceneElementState` | `SCgObjectState` | Состояние: FromMemory, MergedWithMemory, RemovedFromMemory |
| `sceneElementLevel` | `number` | Уровень вложенности (для DistanceBased) |
| `connectorFromScene` | `sc.ScAddr` | Связывающая дуга со структурой |
| `sceneElementSource` | `sc.ScAddr` | Начало коннектора (для связей) |
| `sceneElementTarget` | `sc.ScAddr` | Конец коннектора (для связей) |
| `sceneElementSourceType` | `sc.ScType` | Тип источника |
| `sceneElementTargetType` | `sc.ScType` | Тип цели |

---

## 4. Компонент SCg (scg-component.js)

**Файл:** `external/sc-web/components/scg/src/scg-component.js`

### Регистрация компонента

```javascript
SCgComponent = {
    ext_lang: 'scg_code',
    formats: ['format_scg_json'],
    struct_support: true,
    factory: function (sandbox) {
        return new SCgViewerWindow(sandbox);
    }
};

SCWeb.core.ComponentManager.appendComponentInitialize(SCgComponent);
```

### Конструктор SCgViewerWindow

```javascript
const SCgViewerWindow = function (sandbox) {
    const self = this;

    this.sandbox = sandbox;
    this.tree = new SCg.Tree();
    this.editor = new SCg.Editor();

    // Создание транслятора для структур
    if (sandbox.is_struct) {
        this.scStructTranslator = new SCgStructTranslator(this.editor, this.sandbox);
    }

    // Инициализация редактора
    this.editor.init({
        sandbox: sandbox,
        containerId: sandbox.container,
        autocompletionVariants: autocompletionVariants,
        translateToSc: function (callback) {
            return self.scStructTranslator.translateToSc().then(callback).catch(callback);
        },
        canEdit: this.sandbox.canEdit(),
        resolveControls: this.sandbox.resolveElementsAddr,
    });

    // Делегирование событий
    this.sandbox.eventDataAppend = $.proxy(this.receiveData, this);
    this.sandbox.eventGetObjectsToTranslate = $.proxy(this.getObjectsToTranslate, this);
    this.sandbox.eventApplyTranslation = $.proxy(this.applyTranslation, this);
    this.sandbox.eventStructUpdate = $.proxy(this.eventStructUpdate, this);

    // Запуск обновления контента
    this.sandbox.updateContent();
};
```

### Параметры sandbox

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sandbox.container` | `string` | ID контейнера для редактора |
| `sandbox.is_struct` | `boolean` | Является ли содержимое структурой |
| `sandbox.canEdit()` | `function` | Функция проверки режима редактирования |
| `sandbox.resolveElementsAddr` | `function` | Функция разрешения адресов элементов |

---

## 5. Транслятор SCgStructTranslator (scg-struct.js)

**Файл:** `external/sc-web/components/scg/src/scg-struct.js`

### Создание

```javascript
function SCgStructTranslator(_editor, _sandbox) {
    const fromScTranslator = new SCgStructFromScTranslatorImpl(_editor, _sandbox);
    const toScTranslator = new SCgStructToScTranslatorImpl(_editor, _sandbox);

    return {
        updateFromSc: async function (data) {
            await fromScTranslator.update(data);
        },
        translateToSc: async function () {
            await toScTranslator.update();
        }
    };
}
```

### Параметры конструктора

| Параметр | Тип | Описание |
|----------|-----|----------|
| `_editor` | `Object` | Экземпляр SCg.Editor |
| `_sandbox` | `Object` | Sandbox-объект |

### Методы

| Метод | Параметры | Описание |
|-------|-----------|----------|
| `updateFromSc(data)` | `data: Object` | Добавляет/обновляет элементы из SC-памяти на сцену |
| `translate - | Переводит объекты со сцены в SC-память |

---

##ToSc()` | 6. SCgStructFromScTranslatorImpl - Добавление на сцену

**Файл:** `external/sc-web/components/scg/src/scg-struct.js`

### Внутренние функции

#### generateNode(addr, type)

Генерирует узел на сцене.

```javascript
const generateNode = function (addr, type) {
    const object = SCg.Creator.generateNode(type, randomPos(), '');
    resolveIdtf(addr, object);  // Получить идентификатор
    return object;
};
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `addr` | `number` | sc-адрес узла |
| `type` | `number` | Тип узла (sc_type) |

**Возвращает:** `SCg.ModelNode`

---

#### generateLink(addr, type)

Генерирует ссылку на сцене.

```javascript
const generateLink = function (addr, type) {
    const containerId = 'scg-window-' + sandbox.addr.value + '-' + addr + '-' + new Date().getUTCMilliseconds();
    const object = SCg.Creator.generateLink(type, randomPos(), containerId);
    resolveIdtf(addr, object);
    return object;
};
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `addr` | `number` | sc-адрес ссылки |
| `type` | `number` | Тип ссылки |

**Возвращает:** `SCg.ModelLink`

---

#### generateConnector(sourceObject, targetObject, type)

Генерирует коннектор (дугу/ребро).

```javascript
const generateConnector = function (sourceObject, targetObject, type) {
    return SCg.Creator.generateConnector(sourceObject, targetObject, type);
};
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `sourceObject` | `SCg.ModelNode` | Объект-источник |
| `targetObject` | `SCg.ModelNode` | Объект-цель |
| `type` | `number` | Тип коннектора |

**Возвращает:** `SCg.ModelConnector`

---

#### appendObjectToScene(object, addr, level, state, isCopy)

Добавляет объект на сцену.

```javascript
const appendObjectToScene = function (object, addr, level, state, isCopy) {
    object.setLevel(level);
    object.setObjectState(state);
    editor.scene.appendObject(object);
    object.setScAddr(addr, isCopy);
}
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `object` | `Object` | Модельный объект (node/link/connector) |
| `addr` | `number` | sc-адрес |
| `level` | `number` | Уровень вложенности |
| `state` | `SCgObjectState` | Состояние объекта |
| `isCopy` | `boolean` | Является ли копией |

---

## 7. SCg.Scene - Методы сцены

**Файл:** `external/sc-web/components/scg/src/scg-scene.js`

### appendNode(node)

Добавляет узел на сцену.

```javascript
appendNode: function (node) {
    this.nodes.push(node);
    node.scene = this;
},
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `node` | `SCg.ModelNode` | Узел для добавления |

---

### appendConnector(connector)

Добавляет коннектор на сцену.

```javascript
appendConnector: function (connector) {
    this.connectors.push(connector);
    connector.scene = this;
},
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `connector` | `SCg.ModelConnector` | Коннектор для добавления |

---

### appendLink(link)

Добавляет ссылку на сцену.

```javascript
appendLink: function (link) {
    this.links.push(link);
    link.scene = this;
},
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `link` | `SCg.ModelLink` | Ссылка для добавления |

---

### appendObject(obj)

Универсальный метод - добавляет любой тип объекта.

```javascript
appendObject: function (obj) {
    if (obj instanceof SCg.ModelNode) {
        this.appendNode(obj);
    } else if (obj instanceof SCg.ModelLink) {
        this.appendLink(obj);
    } else if (obj instanceof SCg.ModelConnector) {
        this.appendConnector(obj);
    } else if (obj instanceof SCg.ModelContour) {
        this.appendContour(obj);
    } else if (obj instanceof SCg.ModelBus) {
        this.appendBus(obj);
        obj.setSource(obj.source);
    }
}
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `obj` | `Object` | Объект для добавления (node/link/connector/contour/bus) |

---

## 8. Константы SCgObjectState

| Константа | Описание |
|-----------|----------|
| `SCgObjectState.FromMemory` | Элемент загружен из памяти |
| `SCgObjectState.MergedWithMemory` | Элемент синхронизирован с памятью |
| `SCgObjectState.RemovedFromMemory` | Элемент удален из памяти |

---

## 9. Пример потока данных

```
1. Поисковик (DefaultSCgSearcher) находит элементы структуры:
   
   scTemplate: structure --(arc)--> element
   
2. Для каждого элемента вызывается:
   
   sandbox.eventStructUpdate({
       connectorFromScene: arc,
       sceneElement: element,
       sceneElementType: type,
       sceneElementState: SCgObjectState.FromMemory
   });
   
3. SCgViewerWindow.eventStructUpdate() делегирует в транслятор:
   
   self.scStructTranslator.updateFromSc(data)
   
4. SCgStructFromScTranslatorImpl.update():
   
   - Определяет тип элемента (node/link/connector)
   - Генерирует объект через generateNode/generateLink/generateConnector
   - Добавляет на сцену через appendObjectToScene()
   
5. appendObjectToScene():
   
   - Устанавливает уровень и состояние
   - editor.scene.appendObject(object)
   - object.setScAddr(addr)
   
6. SCg.Scene.appendObject():
   
   - Определяет тип объекта
   - Добавляет в соответствующий массив (nodes/links/connectors)
   - Устанавливает ссылку на сцену
```

---

## 10. Взаимосвязь компонентов

```
┌──────────────────────────────────────────────────────────────┐
│                    external/sc-web/                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  client/js/Core/                                            │
│  ├── scg-content-searcher.js                                │
│  │     ├── DefaultSCgSearcher                                │
│  │     ├── DistanceBasedSCgSearcher                         │
│  │     └── SCgLinkContentSearcher                          │
│  │            │                                              │
│  │            └── sandbox.eventStructUpdate(data)           │
│  │                                                          │
│  ├── componentsandbox.js                                     │
│  │     └── updateContent() → searcher.searchContent()      │
│  │                                                          │
│  └── componentmanger.js                                     │
│        └── factory: sandbox → SCgViewerWindow               │
│                                                              │
│  components/scg/src/                                         │
│  ├── scg-component.js                                        │
│  │     ├── SCgViewerWindow                                  │
│  │     │     ├── this.sandbox.eventStructUpdate            │
│  │     │     └── this.scStructTranslator                   │
│  │     └── SCgComponent (factory)                          │
│  │                                                          │
│  ├── scg-struct.js                                           │
│  │     ├── SCgStructTranslator                              │
│  │     │     ├── updateFromSc()                            │
│  │     │     └── translateToSc()                           │
│  │     ├── SCgStructFromScTranslatorImpl                   │
│  │     │     ├── generateNode()                            │
│  │     │     ├── generateLink()                            │
│  │     │     ├── generateConnector()                       │
│  │     │     └── appendObjectToScene()                     │
│  │     └── SCgStructToScTranslatorImpl                    │
│  │                                                          │
│  └── scg-scene.js                                            │
│        ├── appendNode()                                      │
│        ├── appendLink()                                      │
│        ├── appendConnector()                                 │
│        └── appendObject()                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
