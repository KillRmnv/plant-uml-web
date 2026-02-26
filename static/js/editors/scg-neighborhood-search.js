/**
 * =============================================================================
 * SCg Neighborhood Search - Documentation
 * =============================================================================
 * 
 * Назначение:
 * -----------
 * Этот класс реализует поиск окрестности элемента в базе знаний и отображение
 * результатов на сцене SCg-редактора.
 * 
 * Основной поток работы:
 * --------------------
 * 1. Пользователь вводит поисковый запрос (например, имя элемента)
 * 2. Класс ищет sc-адрес элемента в базе знаний
 * 3. Находит или создает структуру, содержащую этот элемент
 * 4. Запускает поиск окрестности (DefaultSCgSearcher)
 * 5. Найденные элементы добавляются на сцену через SCgStructTranslator
 * 
 * Используемые компоненты:
 * -----------------------
 * - SCWeb.core.DefaultSCgSearcher - поисковик (ограничение 100 триплов)
 * - SCgStructTranslator - добавление элементов на сцену
 * - SCWeb.core.Server.resolveIdentifiers - получение идентификаторов элементов
 * 
 * =============================================================================
 */

/**
 * =============================================================================
 * SCgNeighborhoodSearch
 * =============================================================================
 * 
 * Конструктор класса.
 * 
 * @param {Object} editor - Экземпляр SCg.Editor (редактор сцены)
 * @param {Object} sandbox - Sandbox-объект с настройками и callback-ами
 * 
 * Сохраняет ссылки на editor и sandbox для дальнейшего использования.
 */
class SCgNeighborhoodSearch {
    constructor(editor, sandbox) {
        this.editor = editor;
        this.sandbox = sandbox;
        this.searcher = null;
        this.translator = null;
        this.searchId = 0;
    }

    /**
     * =============================================================================
     * init()
     * =============================================================================
     * 
     * Инициализация поиска. Выполняется один раз при создании экземпляра.
     * 
     * Что делает:
     * -----------
     * 1. Проверяет доступность необходимых компонентов:
     *    - SCgStructTranslator (для добавления на сцену)
     *    - DefaultSCgSearcher (для поиска)
     * 
     * 2. Создает SCgStructTranslator:
     *    - Переводит данные из SC-памяти в объекты на сцене
     *    - Создает узлы, связи, контуры на основе данных из базы
     * 
     * 3. Устанавливает callback eventStructUpdate:
     *    - Вызывается при каждом найденном элементе
     *    - Передает данные в translator для отображения
     * 
     * 4. Создает DefaultSCgSearcher:
     *    - Ограничение: maxSCgTriplesNumber = 100 (в sc-web-core.js)
     *    - Ищет все связанные элементы от ключевого
     * 
     * 5. Подписывается на события обновления (initAppendRemoveElementsUpdate)
     */
    init() {
        console.log('[SCgSearch] Initializing...');
        
        if (!window.SCgStructTranslator) {
            console.error('[SCgSearch] ERROR: SCgStructTranslator not available');
            return;
        }

        // Создаем translator для добавления элементов на сцену
        this.translator = window.SCgStructTranslator(this.editor, this.sandbox);

        // Callback: при каждом найденном элементе - добавить на сцену
        this.sandbox.eventStructUpdate = (data) => {
            // data содержит информацию о найденном элементе:
            // - sceneElement: sc-адрес элемента
            // - sceneElementType: тип элемента (узел, связь, ссылка)
            // - sceneElementState: состояние (FromMemory, RemovedFromMemory)
            // - sceneElementLevel: уровень вложенности (для DistanceBased)
            // - sceneElementSource, sceneElementTarget: для связей
            
            this.translator.updateFromSc(data).then(() => {
                // После добавления - обновляем сцену
            }).catch((err) => {
                console.error('[SCgSearch] ERROR updating scene:', err);
            });
        };

        // Создаем поисковик (DefaultSCgSearcher)
        if (window.SCWeb.core.DefaultSCgSearcher) {
            this.searcher = new window.SCWeb.core.DefaultSCgSearcher(this.sandbox);
        }

        // Подписываемся на события изменения базы знаний
        this.searcher.initAppendRemoveElementsUpdate();
    }

    /**
     * =============================================================================
     * search(query)
     * =============================================================================
     * 
     * Основной метод поиска. Вызывается при нажатии Enter в поле поиска.
     * 
     * @param {string} query - Поисковый запрос (имя элемента, текст ссылки)
     * 
     * Поток выполнения:
     * ----------------
     * 1. Очистить сцену (_clearScene)
     * 2. Найти sc-адрес элемента по запросу (_resolveQueryToAddr)
     *    - Ищет ссылки с таким текстом (searchLinksByContents)
     *    - Находит узел по идентификатору (nrel_system_identifier, nrel_main_idtf)
     * 3. Найти структуру, содержащую элемент (_findStructureContainingElement)
     *    - Ищет: structure --(nrel_scene)--> element
     * 4. Если структура не найдена - создать новую (_createStructureWithElement)
     * 5. Установить адрес структуры в sandbox
     * 6. Вызвать sandbox.updateContent(elementAddr)
     *    - Запускает поисковик
     *    - searchContent ищет связанные элементы
     *    - Для каждого найденного элемента вызывается eventStructUpdate
     *    - translator добавляет элемент на сцену
     */
    async search(query) {
        const searchId = ++this.searchId;
        
        // 1. Очистка сцены
        this._clearScene();

        // 2. Поиск sc-адреса элемента
        const elementAddr = await this._resolveQueryToAddr(query);
        if (!elementAddr) {
            console.log(`[SCgSearch] Ничего не найдено: "${query}"`);
            return;
        }

        // 3. Поиск структуры
        let structureAddr = await this._findStructureContainingElement(elementAddr);
        
        // 4. Если нет структуры - создать
        if (!structureAddr) {
            structureAddr = await this._createStructureWithElement(elementAddr);
        }

        if (!structureAddr) {
            console.log('[SCgSearch] Не удалось найти или создать структуру');
            return;
        }

        // 5. Установить адрес структуры
        this.sandbox.addr = new sc.ScAddr(structureAddr);

        // 6. Запустить поиск и отобразить результат
        await this.sandbox.updateContent(new sc.ScAddr(elementAddr));
    }

    /**
     * =============================================================================
     * _clearScene()
     * =============================================================================
     * 
     * Очищает сцену перед новым поиском.
     * 
     * Удаляет все:
     * - узлы (nodes)
     * - ссылки (links) 
     * - коннекторы/связи (connectors)
     */
    _clearScene() {
        const nodesToDelete = [...this.editor.scene.nodes];
        const linksToDelete = [...this.editor.scene.links];
        const connectorsToDelete = [...this.editor.scene.connectors];
        
        if (nodesToDelete.length > 0) this.editor.scene.deleteObjects(nodesToDelete);
        if (linksToDelete.length > 0) this.editor.scene.deleteObjects(linksToDelete);
        if (connectorsToDelete.length > 0) this.editor.scene.deleteObjects(connectorsToDelete);
        
        this.editor.render.update();
    }

    /**
     * =============================================================================
     * _findStructureContainingElement(elementAddr)
     * =============================================================================
     * 
     * Ищет sc-структуру, которая содержит заданный элемент.
     * 
     * @param {number} elementAddr - sc-адрес элемента
     * @returns {number|null} - адрес структуры или null
     * 
     * Использует шаблон:
     *   structure --(nrel_scene)--> element
     * 
     * SC-шаблон:
     *   [
     *     node[structure] -> arc -> element
     *   ]
     */
    async _findStructureContainingElement(elementAddr) {
        const scTemplate = new sc.ScTemplate();
        scTemplate.triple(
            [sc.ScType.NodeStructure, "structure"],
            [sc.ScType.VarPermPosArc, "arc"],
            new sc.ScAddr(elementAddr)
        );
        
        const result = await window.scClient.searchByTemplate(scTemplate);
        
        if (result && result.length > 0) {
            return result[0].get("structure").value;
        }
        
        return null;
    }

    /**
     * =============================================================================
     * _createStructureWithElement(elementAddr)
     * =============================================================================
     * 
     * Создает новую sc-структуру и добавляет в неё элемент.
     * 
     * @param {number} elementAddr - sc-адрес элемента
     * @returns {number|null} - адрес созданной структуры или null
     * 
     * Создает:
     *   structure --(var_perm_pos_arc)--> element
     * 
     * Примечание: Создает переменные (Var), поэтому элементы могут
     * считаться "удаленными" (RemovedFromMemory). Рекомендуется
     * использовать существующие структуры.
     */
    async _createStructureWithElement(elementAddr) {
        const scTemplate = new sc.ScTemplate();
        scTemplate.triple(
            [sc.ScType.NodeStructure, "struct"],
            [sc.ScType.VarPermPosArc, "arc"],
            new sc.ScAddr(elementAddr)
        );
        
        const result = await window.scClient.generateByTemplate(scTemplate);
        
        if (result) {
            return result.get("struct").value;
        }
        
        return null;
    }

    /**
     * =============================================================================
     * _resolveQueryToAddr(query)
     * =============================================================================
     * 
     * Преобразует текстовый запрос в sc-адрес элемента.
     * 
     * @param {string} query - Текстовый запрос (имя, текст)
     * @returns {number|null} - sc-адрес элемента или null
     * 
     * Алгоритм:
     * ---------
     * 1. Ищет sc-ссылки с таким текстом (searchLinksByContents)
     *    - Возвращает массив адресов ссылок
     * 
     * 2. Если есть ссылки:
     *    - Пытается найти узел по nrel_system_identifier
     *    - Если нет - пробует nrel_main_idtf
     *    - Возвращает адрес узла или адрес ссылки
     * 
     * 3. Если ссылок нет:
     *    - Пытается найти keynode по идентификатору (resolveKeynodes)
     *    - Возвращает адрес keynode
     */
    async _resolveQueryToAddr(query) {
        // Шаг 1: Искать ссылки с таким текстом
        let linkAddrs = await window.scClient.searchLinksByContents([query]);
        
        if (!linkAddrs || !linkAddrs.length || !linkAddrs[0].length) {
            // Шаг 2: Попробовать найти keynode по идентификатору
            const keynodesResult = await window.scClient.resolveKeynodes([{ 
                id: query, 
                type: new sc.ScType() 
            }]);
            
            if (keynodesResult[query] && keynodesResult[query].value) {
                return keynodesResult[query].value;
            }
            
            return null;
        }

        // Нашли ссылки, ищем узел по идентификатору
        const linkAddr = linkAddrs[0][0];
        
        // Пробуем nrel_system_identifier
        let addr = null;
        if (window.scKeynodes && window.scKeynodes["nrel_system_identifier"]) {
            addr = await window.scHelper.searchNodeByIdentifier(
                linkAddr, 
                window.scKeynodes["nrel_system_identifier"]
            );
        }

        // Пробуем nrel_main_idtf
        if (!addr && window.scKeynodes && window.scKeynodes["nrel_main_idtf"]) {
            addr = await window.scHelper.searchNodeByIdentifier(
                linkAddr, 
                window.scKeynodes["nrel_main_idtf"]
            );
        }

        return addr ? addr.value : linkAddr;
    }

    /**
     * =============================================================================
     * destroy()
     * =============================================================================
     * 
     * Очищает ресурсы при удалении экземпляра класса.
     * 
     * Отписывается от событий изменения базы знаний.
     */
    destroy() {
        if (this.searcher && this.searcher.destroyAppendRemoveElementsUpdate) {
            this.searcher.destroyAppendRemoveElementsUpdate();
        }
        this.searcher = null;
        this.translator = null;
    }
}

window.SCgNeighborhoodSearch = SCgNeighborhoodSearch;
