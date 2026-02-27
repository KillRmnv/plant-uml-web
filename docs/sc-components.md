# Компоненты sc-web

## Общая структура

```
components/
├── scg/           # SCg Editor - графический редактор графов
├── scs/           # SCS/SCn Viewer - текстовый просмотрщик
├── html/         # HTML Viewer - просмотр HTML контента
├── github/       # GitHub Viewer - просмотр кода с GitHub
└── external/     # Внешние библиотеки
```

---

## 1. SCg (Semantic Code Graph Editor)

**Назначение:** Графический редактор для визуализации и редактирования графов знаний в SC-коде.

**Точка входа:** `components/scg/scg.html`

### Структура файлов

```
scg/
├── scg.html                              # HTML точка входа
├── build.json                           # Конфигурация сборки
├── src/                                 # Исходники
│   ├── scg.js                          # Главный класс SCg.Editor
│   ├── scg-component.js                # Интеграция с системой компонентов
│   ├── scg-scene.js                    # Управление сценой
│   ├── scg-model-objects.js            # Модели данных
│   ├── scg-object-creator.js          # Фабрика объектов
│   ├── scg-object-builder.js          # Построение объектов
│   ├── scg-render.js                   # Рендеринг (SVG)
│   ├── scg-alphabet.js                 # Типы элементов и SVG определения
│   ├── scg-layout.js                   # Раскладка/позиционирование
│   ├── scg-tree.js                     # Дерево
│   ├── scg-struct.js                    # Структура
│   ├── scg-math.js                     # Математические утилиты
│   ├── scg-debug.js                    # Отладка
│   ├── scg-ui.js                       # UI элементы
│   ├── deleteScgButtons.js             # Кнопки удаления
│   │
│   ├── gwf-*.js                        # Работа с GWF форматом
│   │   ├── gwf-file-creater.js        # Создание GWF файлов
│   │   ├── gwf-file-loader.js          # Загрузка GWF файлов
│   │   ├── gwf-model-objects.js       # Модель объектов GWF
│   │   └── gwf-object-info-reader.js  # Чтение информации
│   │
│   ├── listener/                       # Режимы редактирования
│   │   ├── scg-mode-select.js         # Режим выделения
│   │   ├── scg-mode-connector.js     # Режим создания связей
│   │   ├── scg-mode-bus.js            # Режим создания шин
│   │   ├── scg-mode-contour.js        # Режим создания контуров
│   │   └── scg-mode-link.js           # Режим создания ссылок
│   │
│   └── command/                        # Команды (Command Pattern)
│       ├── command-manager.js          # Менеджер команд
│       ├── create-node.js              # Создание узла
│       ├── create-connector.js         # Создание связи
│       ├── create-bus.js                # Создание шины
│       ├── create-contour.js           # Создание контура
│       ├── create-link.js              # Создание ссылки
│       ├── change-idtf.js              # Изменение идентификатора
│       ├── change-type.js              # Изменение типа
│       ├── change-content.js           # Изменение контента
│       ├── delete-objects.js           # Удаление объектов
│       ├── move-object.js             # Перемещение объекта
│       ├── move-line-point.js          # Перемещение точки линии
│       ├── append-object.js            # Добавление объекта
│       ├── get-node-from-memory.js     # Получение узла из памяти
│       └── wrapper-command.js          # Обёртка команды
│
├── static/
│   └── components/
│       ├── css/
│       │   ├── scg.css                 # Стили
│       │   └── bootstrap-override.css   # Переопределение Bootstrap
│       ├── html/
│       │   ├── scg-tools-panel.html    # Панель инструментов
│       │   ├── scg-types-panel-nodes.html
│       │   ├── scg-types-panel-links.html
│       │   ├── scg-types-panel-connectors.html
│       │   └── scg-delete-panel.html
│       └── images/
│           └── scg/                   # Иконки инструментов
│
├── textures/
│   └── sprites/                        # Спрайты узлов
│
└── kb/                                 # База знаний
    └── sources/
        └── controls/                   # SC коды элементов управления
```

### Сборка (build.json)

```json
{
  "sources": [
    "src/gwf-file-creater.js",
    "src/gwf-file-loader.js",
    "src/gwf-model-objects.js",
    "src/gwf-object-info-reader.js",
    "src/scg-object-builder.js",
    "src/scg.js",
    "src/scg-debug.js",
    "src/scg-math.js",
    "src/scg-model-objects.js",
    "src/scg-alphabet.js",
    "src/scg-render.js",
    "src/scg-scene.js",
    "src/scg-layout.js",
    "src/scg-tree.js"
  ],
  "component": [
    "src/scg-struct.js",
    "src/scg-object-creator.js",
    "src/scg-component.js",
    "src/listener/*.js",
    "src/command/*.js"
  ],
  "target": "static/components/js/scg/scg.js"
}
```

### Основные классы

| Класс | Файл | Описание |
|-------|------|----------|
| `SCg.Editor` | scg.js | Главный класс редактора |
| `SCg.Scene` | scg-scene.js | Управление сценой |
| `SCg.Render` | scg-render.js | Рендеринг SVG |
| `SCg.ModelObject` | scg-model-objects.js | Базовый класс объекта |
| `SCg.ModelNode` | scg-model-objects.js | Узел графа |
| `SCg.ModelLink` | scg-model-objects.js | Ссылка (контент) |
| `SCg.ModelConnector` | scg-model-objects.js | Связь между узлами |
| `SCg.ModelContour` | scg-model-objects.js | Контур |
| `SCg.ModelBus` | scg-model-objects.js | Шина |
| `SCg.Creator` | scg-object-creator.js | Фабрика объектов |
| `SCgCommandManager` | command/command-manager.js | Менеджер команд |

### Типы узлов (scg-alphabet.js)

```
Константные узлы:
- scg.const.node           (круг)
- scg.const.node.tuple     (круг с линией)
- scg.const.node.structure (круг с точкой)
- scg.const.node.role      (круг с крестом)
- scg.const.node.non.role  (круг с X)
- scg.const.node.class    (круг с сеткой)
- scg.const.node.superclass (круг с крышкой)
- scg.const.node.material  (круг с полосками)

Переменные узлы:
- scg.var.node            (квадрат)
- и аналогичные типы для var
```

### Типы связей

```
- common_edge     (общая связь)     <=> / _<=>
- common_arc     (общая дуга)      =>  / _=>
- membership_arc (дуга принадл.)   .>  / _.>
- pos_arc        (положит.)        ->  / _->
- neg_arc        (отрицат.)        -|> / _-|>
- perm_arc       (постоян.)         --> / _-->
- temp_arc       (времен.)         ..> / _..>
```

---

## 2. SCS (Semantic Code System Viewer)

**Назначение:** Текстовый просмотрщик SCs и SCn форматов.

**Особенности:** Не имеет отдельного HTML, встраивается через `sc-web-core.js`.

### Структура файлов

```
scs/
├── build.json
├── src/
│   ├── scs.js                    # Главный класс, инициализация коннекторов
│   ├── scs-viewer.js             # Просмотрщик
│   ├── scs-output.js             # Вывод SCS
│   ├── scs-types.js              # Типы
│   ├── scs-expert-mode.js        # Экспертный режим
│   ├── scn-output.js             # Вывод SCn
│   ├── scn-tree.js               # Дерево SCn
│   ├── scn-highlighter.js        # Подсветка
│   ├── scn-component.js          # Компонент
│   └── removeSystemTriples.js    # Удаление системных триплетов
├── static/
│   └── components/
│       ├── css/scs.css
│       └── js/scs/scs.js         # Собранный файл
└── test/
    ├── nrel_boolean.json
    └── ui_start_sc_element.json
```

### Сборка (build.json)

```json
{
  "sources": [
    "src/scs.js",
    "src/scs-viewer.js",
    "src/scs-output.js",
    "src/scs-types.js",
    "src/scn-output.js",
    "src/scn-tree.js",
    "src/scn-highlighter.js"
  ],
  "component": "src/scn-component.js",
  "target": "static/components/js/scs/scs.js"
}
```

### Основные классы

| Класс | Файл | Описание |
|-------|------|----------|
| `SCs` | scs.js | Пространство имён, коннекторы |
| `SCs.Viewer` | scs-viewer.js | Просмотрщик |
| `SCs.Output` | scs-output.js | Генерация SCS текста |
| `SCs.Types` | scs-types.js | Типы элементов |
| `SCs.ExpertMode` | scs-expert-mode.js | Экспертный режим |
| `SCnViewer` | scn-component.js | Просмотрщик SCn |

### Коннекторы (scs.js)

SCs поддерживает два формата вывода:

**SCs формат:**
```
->   (pos permanent arc)
-|>  (neg permanent arc)
-->  (temp permanent arc)
~>   (actual temp)
%>   (inactual temp)
<=>  (common edge)
=>   (common arc)
.>   (membership arc)
```

**SCn формат (Unicode):**
```
∍   (pos permanent)
∌   (neg permanent)
⇔   (common edge)
⇒   (common arc)
.∍  (membership)
..∍ (temp)
~∍  (actual)
%∍  (inactual)
```

### Компонент (scn-component.js)

```javascript
SCnComponent = {
    ext_lang: 'scn_code',
    formats: ['format_scs_json'],
    factory: function (sandbox) {
        return new SCnViewer(sandbox);
    }
};
```

---

## 3. HTML Viewer

**Назначение:** Просмотр HTML контента со встроенными SC-элементами.

### Структура файлов

```
html/
├── build.json
├── src/
│   ├── html.js             # Заглушка (пустой объект)
│   └── html-component.js  # Компонент просмотрщика
└── static/
    └── components/
        ├── css/html.css
        └── images/
            └── html/
                └── url-ext.png
```

### Сборка (build.json)

```json
{
  "sources": ["src/html.js"],
  "component": "src/html-component.js",
  "target": "static/components/js/html/html.js"
}
```

### Компонент (html-component.js)

```javascript
HtmlComponent = {
    formats: ['format_html'],
    factory: function(sandbox) {
        return new HtmlViewer(sandbox);
    }
};
```

### Функциональность

- Отображает HTML контент
- Обрабатывает `<sc_element>` теги для идентификаторов
- Обрабатывает `<sc_link>` теги для содержимого
- Применяет переводы к элементам

---

## 4. GitHub Viewer

**Назначение:** Просмотр исходного кода с GitHub с подсветкой синтаксиса.

### Структура файлов

```
github/
├── build.json
├── src/
│   ├── github.js             # Заглушка (пустой объект)
│   └── github-component.js   # Компонент просмотрщика
└── static/
    └── components/
        └── css/github.css
```

### Сборка (build.json)

```json
{
  "sources": ["src/github.js"],
  "component": "src/github-component.js",
  "target": "static/components/js/github/github.js"
}
```

### Компонент (github-component.js)

```javascript
GithubComponent = {
    formats: ['format_github_source_link'],
    factory: function(sandbox) {
        return new GithubViewer(sandbox);
    }
};
```

### Использование

Формат данных: `owner=...;repo=...;path=...;syntax=...`

Пример:
```
owner=owner;repo=repo;path=src/main.js;syntax=javascript
```

### Функциональность

- Загружает файл через GitHub API
- Определяет язык по расширению
- Применяет подсветку синтаксиса через Highlight.js

---

## 5. External (Внешние библиотеки)

```
external/
├── js/
│   ├── jquery/
│   │   ├── jquery-1.8.3.min.js
│   │   └── jquery.namespace.js
│   ├── bootstrap.js
│   ├── bootstrap.min.js
│   ├── d3.js
│   ├── d3.min.js
│   ├── three.js
│   ├── three.min.js
│   ├── typeahead.bundle.min.js
│   ├── Constants.js
│   ├── Detector.js
│   └── libs/
│       ├── dat.gui.min.js
│       ├── stats.min.js
│       ├── system.min.js
│       └── tween.min.js
│
└── css/
    ├── bootstrap.css
    └── bootstrap.min.css
```

### Использование библиотек

| Библиотека | Компонент | Назначение |
|------------|-----------|------------|
| jQuery | Все | DOM манипуляции |
| Bootstrap | scg, scs | UI компоненты |
| D3.js | scg | SVG манипуляции |
| Three.js | - | 3D графика (не используется) |
| Typeahead | scg | Автодополнение |
| Highlight.js | github | Подсветка синтаксиса |

---

## Архитектура компонентов

### Регистрация компонента

Каждый компонент регистрируется через `SCWeb.core.ComponentManager.appendComponentInitialize()`:

```javascript
// Пример для SCg
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

### Интерфейс Component Factory

```javascript
Component = {
    ext_lang: 'имя_расширения',    // Уникальное имя
    formats: ['формат_1', 'формат_2'], // Поддерживаемые форматы
    struct_support: true/false,    // Поддержка структур
    factory: function(sandbox) {
        return new Viewer(sandbox);
    }
};
```

### Sandbox API

| Метод | Описание |
|--------|----------|
| `sandbox.container` | ID контейнера |
| `sandbox.addr` | SC-адрес элемента |
| `sandbox.is_struct` | Флаг структуры |
| `sandbox.canEdit()` | Проверка режима редактирования |
| `sandbox.updateContent()` | Обновить контент |
| `sandbox.eventDataAppend` | Колбэк получения данных |
| `sandbox.eventGetObjectsToTranslate` | Колбэк получения объектов для перевода |
| `sandbox.eventApplyTranslation` | Колбэк применения переводов |

### Поток данных

```
Сервер (sc-server)
       ↓
format_scg_json / format_scs_json / format_html
       ↓
Component Factory (sandbox.factory)
       ↓
Viewer (receiveData)
       ↓
Отрисовка
       ↓
Sandbox.applyTranslation (перевод идентификаторов)
```

---

## Сводная таблица компонентов

| Компонент | Формат | Назначение | Состояние |
|-----------|--------|------------|-----------|
| SCg | format_scg_json | Графический редактор | Активен |
| SCS | format_scs_json | Текстовый просмотрщик | Активен |
| HTML | format_html | HTML просмотрщик | Минимальный |
| GitHub | format_github_source_link | GitHub просмотрщик | Минимальный |

---

## Использование в PlantUML

Для реализации PlantUML viewer рекомендуется:

1. **Изучить SCg как основу** - графический рендеринг
2. **Использовать аналогичную архитектуру** - компонент + factory + viewer
3. **Интегрировать с sandbox** - для получения данных с сервера
4. **Использовать D3.js или SVG** - для рендеринга диаграмм
