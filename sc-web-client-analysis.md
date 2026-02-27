# Клиентская точка входа sc-web

## Структура компонентов

```
components/
├── scg/          # SCg-editor (Semantic Code Graph editor) - графический редактор
├── scs/          # SCS-viewer (Semantic Code System viewer) - текстовый просмотрщик
├── html/         # HTML viewer - просмотр HTML контента
├── github/       # GitHub integration - интеграция с GitHub
└── external/     # Внешние библиотеки (jQuery, Bootstrap, Three.js, D3, etc.)
```

## Основная точка входа

### index.html → components/scg/scg.html

**Файл:** `index.html`
```html
<body onload="document.getElementById('scg').click();">
    <a href='components/scg/scg.html' id='scg'>link to scg</a>
</body>
```

Простой редирект на `components/scg/scg.html`.

---

## Компонент SCg (scg.html)

Это **главный компонент** - графический редактор графов знаний.

### Внешние зависимости (общие библиотеки)

| Библиотека | Назначение | Можно отбросить? |
|------------|------------|------------------|
| jQuery | DOM манипуляции | **Нет** |
| Bootstrap | UI компоненты | **Можно** (если не нужны панели) |
| Kinetic.js | Canvas 2D графика | **Нет** (основной рендеринг) |
| D3.js | Data-driven документы | **Можно** (используется для svg) |
| Typeahead | Автодополнение | **Можно** |
| Context.js | Контекстное меню | **Можно** |
| Highlight.js | Подсветка синтаксиса | **Можно** |
| Base64 | Кодирование | **Можно** |
| PDF.js | PDF рендеринг | **Можно** |

### SCg исходные файлы (src/)

#### GWF файлы (работа с форматом GWF)
- `gwf-file-creater.js` - создание GWF файлов
- `gwf-file-loader.js` - загрузка GWF файлов
- `gwf-model-objects.js` - модель объектов GWF
- `gwf-object-info-reader.js` - чтение информации объектов

#### SCg ядро
- `scg.js` - главный класс редактора
- `scg-debug.js` - отладка
- `scg-math.js` - математические утилиты
- `scg-model-objects.js` - модель объектов
- `scg-alphabet.js` - алфавит (символы, типы узлов)
- `scg-render.js` - рендеринг
- `scg-scene.js` - сцена
- `scg-layout.js` - раскладка/позиционирование
- `scg-tree.js` - дерево
- `scg-struct.js` - структура
- `scg-object-creator.js` - создание объектов
- `scg-object-builder.js` - построение объектов
- `scg-component.js` - компонент (интеграция с системой)
- `scg-ui.js` - UI элементы

#### Listener (режимы редактирования)
- `listener/scg-mode-select.js` - режим выделения
- `listener/scg-mode-bus.js` - режим создания шин
- `listener/scg-mode-contour.js` - режим создания контуров
- `listener/scg-mode-connector.js` - режим создания связей
- `listener/scg-mode-link.js` - режим создания ссылок

#### Command (команды редактирования)
- `command/command-manager.js` - менеджер команд
- `command/create-node.js` - создание узла
- `command/create-connector.js` - создание связи
- `command/create-bus.js` - создание шины
- `command/create-contour.js` - создание контура
- `command/create-link.js` - создание ссылки
- `command/change-idtf.js` - изменение идентификатора
- `command/change-content.js` - изменение контента
- `command/change-type.js` - изменение типа
- `command/delete-objects.js` - удаление объектов
- `command/move-object.js` - перемещение объекта
- `command/move-line-point.js` - перемещение точки линии
- `command/append-object.js` - добавление объекта
- `command/get-node-from-memory.js` - получение узла из памяти
- `command/wrapper-command.js` - обертка команды

#### Утилиты
- `deleteScgButtons.js` - кнопки удаления

---

## Компонент SCS (Semantic Code System)

Текстовый просмотрщик SCs формата. **HTML файла нет** - встраивается через `sc-web-core.js`.

### Исходные файлы (src/)
- `scs.js` - главный класс
- `scs-viewer.js` - просмотрщик
- `scs-output.js` - вывод
- `scs-types.js` - типы
- `scs-expert-mode.js` - экспертный режим
- `scn-output.js` - SCn вывод
- `scn-tree.js` - дерево
- `scn-highlighter.js` - подсветка
- `scn-component.js` - компонент
- `removeSystemTriples.js` - удаление системных триплетов

---

## Компонент HTML

Встраиваемый просмотр HTML контента.

### Файлы
- `src/html.js`
- `src/html-component.js`

---

## Компонент GitHub

Интеграция с GitHub.

### Файлы
- `src/github.js` - пустой/заглушка
- `src/github-component.js`

---

## Web Core (client/js/)

Ядро системы - `sc-web-core.js` (собирается из многих файлов).

### Utils
- `sc_types.js` - типы SC
- `sc_keynodes.js` - ключевые узлы
- `utils.js` - утилиты
- `sc_helper.js` - помощник SC
- `stringview.js` - представление строк
- `cache.js` - кэширование
- `cookie.js` - работа с куки
- `fqueue.js` - очередь
- `binary.js` - бинарные данные
- `triples.js` - триплеты
- `sc_link_helper.js` - работа со ссылками

### Core
- `namespace.js`
- `debug.js`
- `main.js` - точка входа
- `server.js` - коммуникация с сервером
- `arguments.js` - аргументы
- `componentsandbox.js` - песочница компонентов
- `translation.js` - интернационализация
- `componentmanger.js` - менеджер компонентов
- `scg-content-searcher.js` - поиск контента
- `eventmanager.js` - события

### UI
- `namespace.js`
- `menu.js` - меню
- `langpanel.js` - панель языка
- `locker.js` - блокировка
- `core.js` - UI ядро
- `searchpanel.js` - панель поиска
- `KeyboardHandler.js` - обработка клавиатуры
- `taskpanel.js` - панель задач
- `argumentspanel.js` - панель аргументов
- `windowmanager.js` - менеджер окон
- `OpenComponentHandler.js` - открытие компонентов
- `userpanel.js` - панель пользователя
- `expertmodepanel.js` - экспертный режим
- `ExpertModeHandler.js` - обработчик экспертного режима

---

## Что можно отбросить

### Полностью отбрасываемые компоненты

| Компонент | Причина |
|-----------|---------|
| **github/** | Заглушка, не используется |
| **html/** | Не нужен для базовой функциональности |
| **scs/** | Текстовый просмотр, не нужен если только графика |
| **map/** | Google Maps (не собирается) |
| **youtube/** | YouTube (не собирается) |
| **image/** | Изображения (закомментирован) |
| **txt/** | Текстовый (закомментирован) |
| **pdf/** | PDF (закомментирован) |

### Отбрасываемые библиотеки

| Библиотека | Файл | Причина |
|------------|------|---------|
| Bootstrap | bootstrap.min.js/css | Только для UI элементов |
| D3.js | d3.js | Используется опционально |
| Typeahead | typeahead.bundle.min.js | Автодополнение |
| Context.js | context.js | Контекстное меню |
| Highlight.js | highlight.min.js | Подсветка синтаксиса |
| PDF.js | pdf.js, pdf.worker.js | PDF рендеринг |
| Base64 | base64.min.js | Кодирование |

### Обязательные компоненты

1. **SCg** - графический редактор (основная цель)
2. **jQuery** - DOM манипуляции
3. **Kinetic.js** - canvas рендеринг
4. **Web Core** - коммуникация с сервером

---

## Минимальная конфигурация

Для простой PlantUML интеграции需要的:

```
components/scg/           # Графический редактор
├── scg.html             # HTML точка входа
├── src/                 # Все JS файлы (обязательно)
│   ├── scg.js
│   ├── scg-render.js
│   ├── scg-scene.js
│   └── ...
└── static/              # CSS и HTML

external/                # Минимум:
├── jquery/              # Обязательно
└── kinetic/             # Обязательно
```

---

## Сборка (Gruntfile.js)

```javascript
// Обязательные таски
concat: {
    webcore: [...]       // core JS
    scg: [...]          // SCg JS
}

// Опциональные таски  
concat: {
    github: {...},      // МОЖНО ОТБРОСИТЬ
    html: {...},        // МОЖНО ОТБРОСИТЬ
    scs: {...}          // МОЖНО ОТБРОСИТЬ
}
```

---

## Вывод

Для реализации PlantUMLviewer нужно:

1. **Обязательно:**
   - `components/scg/` - графический редактор (или адаптировать)
   - jQuery
   - Kinetic.js
   
2. **Можно отбросить:**
   - GitHub, HTML, SCS компоненты
   - Bootstrap, D3, Typeahead, Context, Highlight, PDF.js
   - Web Core (если не нужна связь с sc-server)
