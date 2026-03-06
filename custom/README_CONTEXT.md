# SC-Web Minimal — Документация проекта

## 📋 Обзор проекта

**Цель:** Создать минимальную версию SC-Web с отключенными ненужными компонентами и принудительным использованием SCg-редактора (графический редактор) вместо SCn (текстовый редактор).

**Дата создания:** Март 2026

**Расположение:** `/home/kirillromanoff/University/plant-uml-web/custom/`

---

## 🏗️ Структура директории `custom/`

```
custom/
├── css/
│   └── custom.css              # Стили для минимальной версии
├── js/
│   └── main.js                 # Модифицированный main.js из sc-web
├── server/
│   ├── app.py                  # Серверное приложение (копия из sc-web)
│   ├── sc-web.ini              # Конфигурация логгирования
│   ├── repo.path               # Путь к репозиторию SCS (пустой)
│   ├── logs/
│   │   └── sc-server.log       # Лог сервера
│   ├── admin/                  # Админ-модули (из sc-web)
│   ├── apiai/                  # AI API модули (из sc-web)
│   └── handlers/
│       ├── minimal.py          # Хендлер для minimal.html
│       └── ...                 # Остальные хендлеры (из sc-web)
├── static/                     # НЕ используется (берётся из external/sc-web)
└── templates/
    └── base.html               # Минимальный HTML шаблон
```

---

## 📦 Источники файлов

| Файл | Источник | Статус |
|------|----------|--------|
| `js/main.js` | `external/sc-web/client/js/Core/main.js` | **Модифицирован** |
| `server/*` | `external/sc-web/server/*` | **Копия + правки** |
| `templates/base.html` | `external/sc-web/client/templates/base.html` | **Модифицирован** |
| `css/custom.css` | Новый | **Создан** |

---

## 🎯 Выполненные задачи

### ✅ 1. Отключенные компоненты

Следующие компоненты **НЕ инициализируются** в `SCWeb.ui.Core.init()`:

- ❌ `SCWeb.ui.Menu.init()` — меню команд
- ❌ `SCWeb.ui.ArgumentsPanel.init()` — панель аргументов
- ❌ `SCWeb.ui.UserPanel.init()` — панель пользователя
- ❌ `SCWeb.ui.LanguagePanel.init()` — выбор языка
- ❌ `SCWeb.ui.ExpertModePanel.init()` — панель экспертного режима
- ❌ `SCWeb.ui.TaskPanel.init()` — панель задач

### ✅ 2. Оставленные компоненты

Следующие компоненты **инициализируются**:

- ✅ `SCWeb.ui.WindowManager.init()` — управление окнами
- ✅ `SCWeb.ui.SearchPanel.init()` — поиск
- ✅ `SCWeb.ui.KeyboardHandler.init()` — клавиатура

### ✅ 3. Принудительный SCg

**Реализовано через переопределение `getDefaultExternalLang()`:**

```javascript
SCWeb.core.Main.getDefaultExternalLang = function () {
    // Возвращает адрес формата SCg (69475) вместо адреса языка
    var scgFormatAddr = SCWeb.ui.WindowManager.ext_langs.find(
        function (addr) {
            return addr === 69475 || addr === "69475";
        }
    );
    if (scgFormatAddr) {
        return scgFormatAddr;  // 69475 = format_scg_json
    }
    return this.user.default_ext_lang;  // fallback
};
```

**Адреса форматов:**
- `69475` = `format_scg_json` (SCg — графический редактор)
- `185596` = `format_scn_json` (SCn — текстовый редактор)

### ✅ 4. Экспертный режим

Включён по умолчанию:

```javascript
SCWeb.core.ExpertModeEnabled = true;
SCWeb.core.EventManager.emit("expert_mode_changed");
```

### ✅ 5. Режимы редактирования

Установлены по умолчанию:

```javascript
SCWeb.core.Main.editMode = SCgEditMode.SCgModeSelect;  // Режим выделения
SCWeb.core.Main.viewMode = SCgViewMode.DefaultSCgView;  // Обычный вид
```

---

## 🔧 Ключевые модификации

### 1. `custom/js/main.js`

#### А. Переопределение `WindowManager.init()`

**Цель:** Поменять местами форматы в dropdown (SCg первый)

```javascript
SCWeb.ui.WindowManager.init = function (params) {
    return originalWMInit.call(this, params).then(function () {
        if (this.ext_langs && this.ext_langs.length >= 2) {
            // Меняем местами первый и второй элементы
            var first = this.ext_langs[0];   // 69475 (SCg)
            var second = this.ext_langs[1];  // 185596 (SCn)
            
            this.ext_langs[0] = second;
            this.ext_langs[1] = first;
            
            // Перерисовываем dropdown
            $("#history-item-langs").html(ext_langs_items);
        }
    });
};
```

#### Б. Переопределение `getDefaultExternalLang()`

**Цель:** Возвращать адрес SCg формата вместо адреса языка

```javascript
SCWeb.core.Main.getDefaultExternalLang = function () {
    // Ищем SCg формат (69475)
    var scgFormatAddr = SCWeb.ui.WindowManager.ext_langs.find(
        function (addr) { return addr === 69475; }
    );
    if (scgFormatAddr) return scgFormatAddr;
    return this.user.default_ext_lang;
};
```

#### В. Переопределение `SCWeb.ui.Core.init()`

**Цель:** Отключить ненужные компоненты

```javascript
SCWeb.ui.Core.init = function (data) {
    return Promise.all([
        // Отключено:
        // SCWeb.ui.Menu.init(data),
        // SCWeb.ui.ArgumentsPanel.init(),
        // SCWeb.ui.UserPanel.init(data),
        // SCWeb.ui.LanguagePanel.init(data),
        // SCWeb.ui.ExpertModePanel.init(),
        
        // Оставлено:
        SCWeb.ui.WindowManager.init(data),
        SCWeb.ui.SearchPanel.init(),
        SCWeb.ui.KeyboardHandler.init(SCWeb.ui.WindowManager),
        SCWeb.ui.Core.resolveElementsAddr("body"),
    ]).then(function () {
        // Включаем экспертный режим
        SCWeb.core.ExpertModeEnabled = true;
        SCWeb.core.EventManager.emit("expert_mode_changed");
        
        // Устанавливаем SCg режимы
        SCWeb.core.Main.editMode = SCgEditMode.SCgModeSelect;
        SCWeb.core.Main.viewMode = SCgViewMode.DefaultSCgView;
    });
};
```

### 2. `custom/templates/base.html`

**Удалённые элементы:**
- `<nav id="header">` — верхняя панель
- `<div id="menu_container">` — меню
- `<div id="auth-user-panel">` — авторизация
- `<div id="language-panel">` — выбор языка
- `<div id="expert_mode_container">` — переключатель режима
- `<div id="static-window-container">` — боковая панель
- `<div id="footer">` — нижняя панель
- `<div id="arguments_container">` — аргументы

**Оставленные элементы:**
- `<div id="window-header-tools">` — поиск
- `<div id="window-container">` — контейнер окон

### 3. `custom/server/app.py`

**Добавлено:**
```python
# Переменная окружения для пути к sc-web
SC_WEB_ROOT = os.environ.get('SC_WEB_ROOT', 
    join(dirname(dirname(abspath(__file__))), 'external/sc-web'))

# Путь к кастомным шаблонам
CUSTOM_TEMPLATES = join(dirname(abspath(__file__)), "../templates")

# Использование переменных
tornado.options.define("static_path", 
    default=join(SC_WEB_ROOT, "client/static"), ...)
tornado.options.define("templates_path", 
    default=CUSTOM_TEMPLATES, ...)
```

**Маршрут для статики custom:**
```python
(r"/custom/js/(.*)", NoCacheStaticHandler, 
    {"path": custom_js_path}),
```

---

## 🚀 Запуск сервера

### Команда запуска:

```bash
cd /home/kirillromanoff/University/plant-uml-web/custom/server
SC_WEB_ROOT=/home/kirillromanoff/University/plant-uml-web/external/sc-web \
python3 app.py
```

### В фоне:

```bash
cd /home/kirillromanoff/University/plant-uml-web/custom/server
SC_WEB_ROOT=/home/kirillromanoff/University/plant-uml-web/external/sc-web \
nohup python3 app.py > /tmp/sc-web-custom.log 2>&1 &
```

### Проверка:

```bash
tail -10 /tmp/sc-web-custom.log
# Должно быть: "Application is running and listening on http://localhost:8000"
```

---

## 🌐 URL

| URL | Описание |
|-----|----------|
| `http://localhost:8000/` | Минимальная версия (SCg) |

---

## 🧪 Консольные логи (ожидаемые)

```
[Minimal] WindowManager.init() вызван
[Minimal] ext_langs до: [69475, 185596]
[Minimal] Меняем местами: 69475 и 185596
[Minimal] ext_langs после: [185596, 69475]
[Minimal] dropdown перерисован
[Minimal] getDefaultExternalLang вызван
[Minimal] WindowManager: существует
[Minimal] ext_langs: [185596, 69475]
[Minimal] getDefaultExternalLang вернул SCg формат: 69475
[Minimal] UI инициализирован (Expert Mode: ON, Editor: SCg)
```

---

## ⚠️ Известные проблемы

### 1. `window.scKeynodes['format_scg_json']` = undefined

**Причина:** Keynodes не разрешаются в момент вызова `WindowManager.init()`.

**Решение:** Использовать прямой поиск по адресу (69475) в массиве `ext_langs`.

### 2. Порядок инициализации

**Проблема:** `getDefaultExternalLang()` вызывается ДО инициализации `WindowManager`.

**Текущий статус:** Требует дополнительной отладки.

---

## 📝 Следующие шаги (TODO)

### Критичные:

1. **Проверить вызов `getDefaultExternalLang()`**
   - Убедиться, что функция вызывается при создании окна
   - Добавить логи в `WindowManager.appendHistoryItem()`

2. **Альтернативный подход: переопределение `showDefaultPage()`**
   ```javascript
   SCWeb.core.Main.showDefaultPage = function(params) {
       const argumentAddr = window.scKeynodes['ui_start_sc_element'];
       const scgFormat = 69475;  // format_scg_json
       if (scgFormat) {
           this.doCommandWithFormat([argumentAddr], scgFormat);
       } else {
           this.doDefaultCommand([argumentAddr]);
       }
   };
   ```

3. **Проверить `ComponentManager.getPrimaryFormatForExtLang()`**
   - Убедиться, что возвращает SCg для переданного языка

### Опциональные:

4. **Добавить кнопку переключения SCg/SCn**
5. **Сохранять предпочтения пользователя в LocalStorage**
6. **Добавить CSS для скрытия элементов (если нужно)**

---

## 📚 Ссылки на исходники

| Файл | Путь |
|------|------|
| Оригинальный `main.js` | `external/sc-web/client/js/Core/main.js` |
| Оригинальный `base.html` | `external/sc-web/client/templates/base.html` |
| Оригинальный сервер | `external/sc-web/server/app.py` |
| `WindowManager` | `external/sc-web/client/js/Ui/windowmanager.js` |
| `ComponentManager` | `external/sc-web/client/js/Core/componentmanger.js` |
| SCg компонент | `external/sc-web/components/scg/src/scg-component.js` |

---

## 🔑 Ключевые адреса (sc-addr)

| Адрес | Идентификатор | Описание |
|-------|--------------|----------|
| `69475` | `format_scg_json` | Формат SCg JSON |
| `185596` | `format_scn_json` | Формат SCn JSON |
| `68419` | `ui_start_sc_element` | Стартовый элемент |
| `65690` | `lang_ru` | Русский язык |
| `67132` | `lang_en` | Английский язык |

---

## 💡 Заметки

- **Expert Mode** включён, но UI переключатель скрыт (удалён из HTML)
- **SCg инструменты** (Select, Connector, Bus, Contour, Link) доступны после загрузки редактора
- **Поиск** работает через typeahead в правом верхнем углу
- **Автосохранение** не реализовано (требуется отдельная реализация)

---

## 📞 Контакты

**Проект:** Plant-UML Web — SCg Editor  
**Репозиторий:** https://github.com/KillRmnv/plant-uml-web  
**Документация OSTIS:** https://ostis.net/

---

**Последнее обновление:** 6 марта 2026 г.
