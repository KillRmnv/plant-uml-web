# scg-content-searcher.js

## Общее описание

Файл `scg-content-searcher.js` реализует поисковики содержимого для визуализации sc-структур и sc-ссылок в графическом редакторе SCg. Файл содержит три основных класса: `DefaultSCgSearcher`, `DistanceBasedSCgSearcher` и `SCgLinkContentSearcher`.

## Основные классы

### 1. SCWeb.core.DefaultSCgSearcher

Класс поисковика содержимого структур по умолчанию. Выполняет простой поиск всех элементов структуры без учёта уровней иерархии.

#### Конструктор

Принимает параметр `sandbox` - объект песочницы компонента.

#### Внутренние функции:

**`splitArray(result, maxNumberOfTriplets)`** - разбивает массив результатов на части указанного размера

**`filterTriples(triples, filterList)`** - фильтрует тройки, оставляя только разъёмы (connectors) и опционально исключая элементы из списка фильтрации

**`searchStructureElements(toFilter)`** - асинхронно выполняет поиск элементов структуры:
- Создаёт sc-шаблон для поиска всех элементов, связанных с адресом структуры
- Выполняет поиск через `scClient.searchByTemplate`
- Получает типы найденных элементов
- Фильтрует и возвращает результаты

**`initAppendRemoveElementsUpdate()`** - инициализирует подписки на события добавления и удаления элементов:
- Подписка на `AfterGenerateOutgoingArc` - при добавлении новой дуги
- Подписка на `BeforeEraseOutgoingArc` - при удалении дуги

**`destroyAppendRemoveElementsUpdate()`** - уничтожает подписки на события

#### Возвращаемые методы:

- `searchContent()` - основной метод поиска содержимого
- `initAppendRemoveElementsUpdate()` - инициализация обновлений
- `destroyAppendRemoveElementsUpdate()` - уничтожение обновлений

---

### 2. SCWeb.core.DistanceBasedSCgSearcher

Класс поисковика содержимого структур на основе расстояния. Реализует иерархический поиск элементов структуры по уровням, начиная от ключевых элементов.

#### Конструктор

Принимает параметр `sandbox` - объект песочницы компонента.

Дополнительные свойства:
- `maxSCgTriplesNumber` - максимальное количество триплетов (не используется напрямую)
- `generateArcEvent` - подписка на событие добавления дуги
- `eraseArcEvent` - подписка на событие удаления дуги
- `newElements` - массив новых элементов для обновления
- `appendUpdateDelayTime` - задержка обновления (200мс)

#### Внутренние функции:

**`searchAllElements()`** - асинхронно ищет все элементы структуры и возвращает Set их адресов

**`searchFromKeyElements(keyElements, state)`** - асинхронно выполняет поиск от ключевых элементов:
- Получает ключевые элементы структуры через `scHelper`
- Для каждого ключевого элемента инициирует поиск на следующем уровне
- Возвращает Set посещённых элементов

**`searchAllLevelConnectors(elementsArr, visitedElements, tracedElements)`** - рекурсивно обходит все уровни элементов:
- Для каждого элемента определяет тип (connector или node)
- Вызывает соответствующую функцию поиска
- Продолжает обход пока есть новые элементы

**`searchLevelNodeConnectors(connectorFromScene, mainElement, mainElementType, state, level, nextLevel, tracedElements)`** - ищет connectors для узла на заданном уровне

**`searchLevelConnectorElementsConnectors(connectorFromScene, mainElement, mainElementType, state, level, nextLevel, tracedElements)`** - ищет connectors для connector-элемента

**`searchLevelConnectorElements(connectorFromScene, mainElement, mainElementType, state, level, nextLevel, nextLevelElements, tracedElements)`** - ищет конечные элементы (source и target) для connector-элемента

**`searchLevelConnectorsByDirection(connectorFromScene, mainElement, mainElementType, state, level, nextLevel, nextLevelElements, tracedElements, withIncomingConnector)`** - ищет connectors в заданном направлении (входящие или исходящие)

**`verifyStructureElements(structure, elements)`** - верифицирует принадлежность элементов структуре

**`debounceBufferedFunc(func, wait)`** - создаёт debounced версию функции с буферизацией

**`searchElementsFromElements(elements)`** - асинхновенно ищет элементы от указанных, с учётом уже отрисованных элементов сцены

**`appendElementsUpdate(elAddr, connector, otherAddr)`** - обработчик добавления элемента

**`removeElementsUpdate(elAddr, connector, otherAddr)`** - обработчик удаления элемента

**`initAppendRemoveElementsUpdate()`** - инициализирует подписки на события

**`destroyAppendRemoveElementsUpdate()`** - уничтожает подписки на события

#### Возвращаемые методы:

- `searchContent(keyElements)` - основной метод поиска содержимого с поддержкой ключевых элементов
- `initAppendRemoveElementsUpdate()` - инициализация обновлений
- `destroyAppendRemoveElementsUpdate()` - уничтожение обновлений

#### Особенности DistanceBasedSCgSearcher:

1. **Иерархический поиск** - элементы ищутся по уровням, начиная от ключевых
2. **Debounced обновления** - изменения буферизуются и применяются с задержкой
3. **Учёт отрисованных элементов** - поиск продолжается только от элементов уже присутствующих на сцене
4. **Поддержка ключевых элементов** - можно указать конкретные элементы для начала поиска

---

### 3. SCWeb.core.SCgLinkContentSearcher

Класс поисковика содержимого для sc-ссылок. Загружает и передаёт содержимое ссылок.

#### Конструктор

Принимает параметры:
- `sandbox` - объект песочницы компонента
- `linkAddr` - адрес ссылки

Свойства:
- `contentBucket` - массив для накопления ссылок
- `contentBucketSize` - максимальный размер буфера (20)
- `appendContentTimeoutId` - ID таймера отложенной загрузки
- `appendContentTimeout` - таймаут загрузки (2мс)

#### Внутренние функции:

**`forceAppendData(oldBucket)`** - принудительно загружает и передаёт данные для всех ссылок из буфера

**`sliceAndForceAppendData()`** - очищает буфер и загружает содержимое

**`searchData(element)`** - добавляет элемент в буфер и запускает загрузку:
- Если буфер превысил размер - немедленная загрузка
- Иначе - отложенная загрузка через таймаут

#### Возвращаемые методы:

- `searchContent()` - основной метод поиска содержимого ссылки

---

## Взаимодействие с другими модулями

### Используемые внешние объекты:

- `sandbox` - объект песочницы компонента
- `scClient` - клиент для работы с SC-сервером
- `window.scHelper` - вспомогательные функции для работы с SC-элементами
- `SCgObjectState` - состояния объектов (FromMemory, MergedWithMemory, RemovedFromMemory)
- `SCgObjectLevel` - уровни объектов в иерархии

### События sandbox:

- `sandbox.eventStructUpdate` - событие обновления структуры (для DefaultSCgSearcher и DistanceBasedSCgSearcher)
- `sandbox.eventDataAppend` - событие добавления данных (для SCgLinkContentSearcher)
- `sandbox.layout` - функция раскладки сцены
- `sandbox.postLayout` - функция пост-раскладки

## Алгоритм работы DefaultSCgSearcher

1. Выполняет поиск всех элементов структуры через шаблон
2. Фильтрует результаты, оставляя только connectors
3. Ограничивает количество результатов (maxSCgTriplesNumber = 300)
4. Для каждого найденного элемента вызывает sandbox.eventStructUpdate
5. Подписывается на события изменения структуры в реальном времени

## Алгоритм работы DistanceBasedSCgSearcher

1. Находит все элементы структуры
2. Получает ключевые элементы структуры
3. Для каждого ключевого элемента начинает поиск:
   - На первом уровне добавляет сам ключевой элемент
   - На каждом следующем уровне ищет connectors и их конечные элементы
   - Продолжает пока есть непосещённые элементы
4. При получении ключевых элементов - поиск начинается от них
5. Подписывается на события изменения с debounce задержкой

## Алгоритм работы SCgLinkContentSearcher

1. При вызове searchContent добавляет адрес ссылки в буфер
2. Если буфер достигает максимального размера - немедленно загружает содержимое
3. Иначе устанавливает таймер для отложенной загрузки
4. Получает содержимое через scClient.getLinkContents
5. Передаёт данные через sandbox.eventDataAppend
