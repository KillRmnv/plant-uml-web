# DistanceBasedSCgSearcher - Алгоритм поиска

## Общее описание

`DistanceBasedSCgSearcher` - это поисковик для отображения семантической окрестности узла в режиме Distance Based (поуровневый поиск). При двойном клике на узел ищутся связанные с ним элементы и отображаются на сцене.

## Основные понятия

### SCgObjectLevel (Уровни)
```javascript
const SCgObjectLevel = {
    First: 0,    // Начальный уровень (кликнутый узел)
    Second: 1,   // Связанные элементы (1 уровень)
    Third: 2,
    Fourth: 3,
    Fifth: 4,
    Sixth: 5,
    Seventh: 6,  // Максимальный уровень
    Count: 7
};
```

### SCgObjectState (Состояния)
```javascript
const SCgObjectState = {
    Normal: 0,
    MergedWithMemory: 1,
    NewInMemory: 2,
    FromMemory: 3,
    RemovedFromMemory: 4
};
```

## Вызов поиска

### Триггер: Двойной клик на узел
1. Пользователь делает двойной клик на узел в SCg-редакторе
2. В `scg-render.js` срабатывает обработчик `dblclick`:
   ```javascript
   if (SCWeb.core.Main.viewMode === SCgViewMode.DistanceBasedSCgView) {
       self.sandbox.updateContent(new sc.ScAddr(d.sc_addr));
   }
   ```
3. Вызывается `sandbox.updateContent(keyElement)` с адресом узла

### Вызов в SCgEditor (scg-editor.js)
```javascript
_updateContent(keyElement) {
    // 1. Устанавливаем адрес в sandbox
    this.sandbox.addr = keyElement;
    
    // 2. Очищаем сцену
    this._clearScene();
    
    // 3. Запускаем поиск
    this.searcher.searchContent([keyElement])
        .then((status) => {
            // Обновляем layout и render
            this.editor.scene.layout();
            this.editor.render.update();
        });
}
```

## Алгоритм поиска

### 1. searchContent(keyElements)

**Входные данные:** Массив ключевых элементов `[sc.Addr]`

**Логика:**
```javascript
searchContent: async function (keyElements) {
    // 1. Настроить callbacks для layout
    sandbox.layout = (scene) => scene.updateRender();
    sandbox.postLayout = (scene) => scene.layout();

    // 2. Если переданы ключевые элементы - ищем от них
    if (keyElements && keyElements.length > 0) {
        // Установить sandbox.addr для поиска
        sandbox.addr = keyElements[0];
        
        // Вызвать поиск от ключевых элементов
        const visitedElements = await searchFromKeyElements(keyElements);
        status = visitedElements.size > 0;
    }
    
    // 3. Дополнительно ищем структурные элементы
    let structureElements = await searchAllElements();
    
    // 4. Цикл по уровням (для расширения окрестности)
    while (structureElements.size) {
        const visitedElements = await searchFromKeyElements(keyElements);
        // ... обработка
    }
    
    return status;
}
```

### 2. searchFromKeyElements(keyElements)

**Входные данные:** Массив ключевых элементов для начала поиска

**Логика:**
```javascript
searchFromKeyElements: async function (keyElements, state = SCgObjectState.FromMemory) {
    let visitedElements = new Set();
    
    // 1. Преобразование входных данных
    // Если переданы прямые sc.Addr - преобразуем в формат структурных triples
    if (keyElements - это массив sc.Addr) {
        directAddrs = keyElements.map(addr => ({
            structureElement: addr,
            connectorFromStructure: null
        }));
    }
    
    // 2. Получить типы элементов через getElementsTypes
    const elementTypes = await scClient.getElementsTypes(validAddrs);
    
    // 3. Создать mainElements - словарь элементов для обработки
    for (каждый элемент) {
        mainElements[element.value] = {
            connectorFromScene: connectorFromStructure,
            type: elementType,
            state: state,
            level: SCgObjectLevel.First
        };
        
        // 4. Вызвать eventStructUpdate для добавления на сцену
        sandbox.eventStructUpdate({
            connectorFromScene: ...,
            sceneElement: element,
            sceneElementType: elementType,
            sceneElementState: state,
            sceneElementLevel: level
        });
    }
    
    // 5. Искать связанные элементы на следующих уровнях
    await searchAllLevelConnectors([mainElements], visitedElements, new Set());
    
    return visitedElements;
}
```

### 3. searchAllLevelConnectors(elementsArr, visitedElements, tracedElements)

**Цель:** Рекурсивный поиск по уровням (Level-based search)

**Логика:**
```javascript
searchAllLevelConnectors: async function (elementsArr, visitedElements, tracedElements) {
    let newElementsArr = [];
    
    // Для каждого элемента текущего уровня
    for (каждый elementHash в elementsArr) {
        // Пропускаем уже посещённые
        if (visitedElements.has(elementHash)) continue;
        visitedElements.add(elementHash);
        
        const element = new sc.ScAddr(elementHash);
        
        // Определяем тип элемента (коннектор или нет)
        const isConnector = elementType.isConnector();
        
        // Выбираем функцию поиска
        const searchFunc = isConnector 
            ? searchLevelConnectorElementsConnectors 
            : searchLevelNodeConnectors;
        
        // Ищем связанные элементы
        const newElements = await searchFunc(...);
        
        if (newElements.length > 0) {
            newElementsArr.push(newElements);
        }
    }
    
    // Если есть новые элементы - продолжаем на следующем уровне
    if (newElementsArr.length > 0) {
        await searchAllLevelConnectors(newElementsArr, visitedElements, tracedElements);
    }
}
```

### 4. searchLevelNodeConnectors

**Цель:** Поиск коннекторов связанных с узлом

**Логика:**
```javascript
searchLevelNodeConnectors: async function (
    connectorFromScene, mainElement, mainElementType, 
    state, level, nextLevel, tracedElements) {
    
    let nextLevelElements = {};
    
    // Искать входящие коннекторы (куда указывает mainElement)
    await searchLevelConnectorsByDirection(
        connectorFromScene, mainElement, mainElementType,
        state, level, nextLevel, nextLevelElements, tracedElements, 
        true  // withIncomingConnector = true
    );
    
    // Искать исходящие коннекторы (откуда приходит mainElement)
    await searchLevelConnectorsByDirection(
        connectorFromScene, mainElement, mainElementType,
        state, level, nextLevel, nextLevelElements, tracedElements, 
        false // withIncomingConnector = false
    );
    
    return nextLevelElements;
}
```

### 5. searchLevelConnectorsByDirection

**Цель:** Поиск коннекторов в определённом направлении

**Внимание: Это ключевая функция с важной особенностью!**

```javascript
searchLevelConnectorsByDirection: async function (
    connectorFromScene, mainElement, mainElementType,
    state, level, nextLevel, nextLevelElements, tracedElements, 
    withIncomingConnector) {
    
    // ВАЖНО: Шаблон ищет элементы связанные с sandbox.addr (структурой)
    let scTemplate = new sc.ScTemplate();
    scTemplate.triple(
        sandbox.addr,                                    // <-- Структура!
        [sc.ScType.VarPermPosArc, "_connector_from_scene"],
        [sc.ScType.Unknown, "_scene_connector"],
    );
    
    if (withIncomingConnector) {
        // Ищем: source -> scene_connector -> mainElement
        scTemplate.triple(
            [sc.ScType.Unknown, "_scene_connector_source"],
            "_scene_connector",
            mainElement,                                 // <-- Текущий элемент
        );
    } else {
        // Ищем: mainElement -> scene_connector -> target
        scTemplate.triple(
            mainElement,                                 // <-- Текущий элемент
            "_scene_connector",
            [sc.ScType.Unknown, "_scene_connector_target"],
        );
    }
    
    // Выполнить поиск
    const constructions = await scClient.searchByTemplate(scTemplate);
    
    // Обработать результаты
    for (каждый result) {
        // Добавить коннектор и связанный элемент в nextLevelElements
        nextLevelElements[connectorHash] = {...};
        nextLevelElements[elementHash] = {...};
        
        // Вызвать eventStructUpdate для добавления на сцену
        sandbox.eventStructUpdate({...});
    }
}
```

### 6. eventStructUpdate - Добавление на сцену

После каждого найденного элемента вызывается `sandbox.eventStructUpdate(triple)`:

```javascript
eventStructUpdate: function(triple) {
    // triple содержит:
    // - sceneElement: sc.Addr элемента
    // - sceneElementType: тип элемента
    // - sceneElementLevel: уровень (0-6)
    // - sceneElementState: состояние
    // - sceneElementSource: (опционально) source для коннекторов
    // - sceneElementTarget: (опционально) target для коннекторов
    
    // В scg-editor.js вызывается _handleStructUpdate
    _handleStructUpdate(triple);
}
```

## Проблемы и особенности

### 1. Использование sandbox.addr

**Важно:** В функции `searchLevelConnectorsByDirection` используется `sandbox.addr` как корень поиска. Это работает так:

- Если мы ищем структуру (sc-structure) - это правильно
- Если мы ищем окрестность узла - `sandbox.addr` устанавливается в адрес узла

**Проблема:** При двойном клике на узел `sandbox.addr` устанавливается в адрес узла, но поиск ищет элементы связанные с этой "структурой", а не с узлом напрямую.

### 2. verifyStructureElements

Функция `verifyStructureElements` проверяет, какие элементы из списка принадлежат структуре:

```javascript
const verifyStructureElements = async function (structure, elements) {
    // Для каждого элемента ищем связь со структурой
    let template = new sc.ScTemplate();
    template.triple(
        structure,                      // sandbox.addr
        [sc.ScType.VarPermPosArc, "_connector_from_scene"],
        [element, "_main_node"]
    );
    
    let result = await scClient.searchByTemplate(template);
    if (result.length) {
        structureElements.push({
            connectorFromStructure: result[0].get("_connector_from_scene"),
            structureElement: result[0].get("_main_node")
        });
    }
};
```

### 3. Обработка ключевых элементов

При передаче прямых `sc.Addr` (а не структурных triples):

```javascript
// Преобразование
directAddrs = keyElements.map(addr => ({
    structureElement: addr,           // сам адрес
    connectorFromStructure: null     // без связи со структурой
}));
```

## Диаграмма потока данных

```
Двойной клик на узел
       |
       v
sandbox.updateContent(sc.Addr)
       |
       v
searchContent([sc.Addr])
       |
       +---> searchFromKeyElements([sc.Addr])
       |           |
       |           +---> getElementsTypes() - получить типы
       |           |
       |           +---> eventStructUpdate() - добавить узел на 1-й уровень
       |           |
       |           +---> searchAllLevelConnectors()
       |                       |
       |                       +---> searchLevelNodeConnectors()
       |                       |           |
       |                       |           +---> searchLevelConnectorsByDirection (входящие)
       |                       |           |
       |                       |           +---> searchLevelConnectorsByDirection (исходящие)
       |                       |
       |                       +---> [если есть новые] -> рекурсия на следующий уровень
       |
       +---> searchAllElements() - доп. поиск структурных элементов
       
eventStructUpdate() --> _handleStructUpdate() --> SCgObjectCreator.create() --> scene.appendObject()
```

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `scg-content-searcher.js` | Основная логика поиска |
| `scg-editor.js` | Интеграция с редактором, обработка eventStructUpdate |
| `scg-render.js` | Обработка dblclick, вызов updateContent |
| `scg-scene.js` | Управление сценой (nodes, connectors, links) |
| `scg-object-creator.js` | Создание объектов сцены |

## Константы уровней (SCgObjectLevel)

| Уровень | Описание | Цвет |
|---------|----------|------|
| First (0) | Кликнутый узел | - |
| Second (1) | Непосредственно связанные | - |
| Third (2) | Связанные через 2 дуги | - |
| ... | ... | ... |
| Seventh (6) | Максимальная глубина | - |

При повторном клике на узел уровень увеличивается, пока не достигнет максимума (6).
