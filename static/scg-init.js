/**
 * SCg Editor Initialization
 * 
 * TODO: 
 * 1. Подключить ts-sc-client для WebSocket коммуникации с backend
 * 2. Реализовать полную интеграцию с backend API
 * 3. Добавить обработчики событий редактора (создание, удаление, изменение узлов)
 * 4. Реализовать сохранение/загрузку графа
 * 5. Добавить обработку ошибок подключения
 * 6. Добавить логирование
 */

'use strict';

// =============================================================================
// КОНФИГУРАЦИЯ
// =============================================================================

/**
 * TODO: Получить URL из настроек или localStorage
 * const SC_SERVER_URL = localStorage.getItem('sc_server_url') || 'ws://localhost:8090/ws_json';
 */
const SC_SERVER_URL = 'ws://localhost:8090/ws_json';

// =============================================================================
// SCg EDITOR INITIALIZATION
// =============================================================================

/**
 * Инициализация при загрузке DOM
 */
$(document).ready(function() {
    
    console.log('[SCg] Инициализация редактора...');
    
    // Проверка зависимостей
    if (typeof $ === 'undefined') {
        console.error('[SCg] jQuery не загружен!');
        return;
    }
    if (typeof d3 === 'undefined') {
        console.error('[SCg] D3.js не загружен!');
        return;
    }
    if (typeof SCg === 'undefined') {
        console.error('[SCg] SCg.Editor не найден! Проверьте подключение scg.js');
        return;
    }
    
    // TODO: Инициализировать ts-sc-client для коммуникации с backend
    // const scClient = new sc.ScClient(SC_SERVER_URL);
    
    /**
     * Sandbox - объект для интеграции SCg с внешней системой
     * TODO: Реализовать полный API для взаимодействия с backend
     */
    const sandbox = {
        // ID контейнера
        container: 'scg-container',
        
        // TODO: Получить из URL или backend
        addr: 0,
        
        // Является ли редактируемая сущность структурой
        is_struct: false,
        
        // TODO: Получить из backend
        format_addr: 'format_scg_json',
        
        /**
         * Резолвинг идентификаторов в sc-адреса
         * TODO: Реализовать вызов к backend API
         */
        resolveElementsAddr: async function(identifiers) {
            console.log('[SCg] Резолвинг идентификаторов:', identifiers);
            
            try {
                const response = await fetch('/api/elements/resolve', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        // TODO: Добавить токен авторизации
                        // 'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ identifiers })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                console.log('[SCg] Резолвинг успешен:', result);
                return result;
            } catch (error) {
                console.error('[SCg] Ошибка резолвинга:', error);
                return {};
            }
        },
        
        /**
         * Проверка прав на редактирование
         * TODO: Интегрировать с системой авторизации
         */
        canEdit: function() {
            // TODO: Проверять права пользователя
            return true;
        },
        
        /**
         * Создание viewer для sc-links
         * TODO: Реализовать просмотр содержимого ссылок
         */
        createViewersForScLinks: function(links) {
            console.log('[SCg] Создание viewers для ссылок:', links);
            // TODO: Реализовать просмотр содержимого ссылок (изображения, PDF, HTML и т.д.)
        }
    };
    
    // =============================================================================
    // INITIALIZE EDITOR
    // =============================================================================
    
    try {
        const editor = new SCg.Editor();
        
        editor.init({
            containerId: 'scg-container',
            canEdit: true,
            sandbox: sandbox,
            
            /**
             * Автодополнение идентификаторов
             * TODO: Подключить к backend для поиска по базе знаний
             */
            autocompletionVariants: function(keyword, callback) {
                console.log('[SCg] Запрос автодополнения для:', keyword);
                
                // TODO: Заменить на реальный API вызов
                // fetch('/api/idtf/search?q=' + keyword)
                //     .then(r => r.json())
                //     .then(data => callback(data));
                
                callback([]);
            },
            
            /**
             * Перевод в SCn формат
             * TODO: Интегрировать с py-sc-kpm
             */
            translateToSc: function(callback) {
                console.log('[SCg] Перевод в SCn...');
                
                // TODO: Отправить данные на backend для генерации SCn
                // const graphData = editor.scene.exportToJson();
                // fetch('/api/kpm/generate_scs', {
                //     method: 'POST',
                //     body: JSON.stringify(graphData)
                // }).then(r => r.json()).then(callback);
                
                callback({});
            }
        });
        
        console.log('[SCg] Редактор инициализирован успешно');
        
        // Сохранить редактор в глобальную переменную для доступа из консоли
        window.scgEditor = editor;
        
    } catch (error) {
        console.error('[SCg] Ошибка инициализации редактора:', error);
        return;
    }
    
    // =============================================================================
    // KEYBOARD HANDLERS
    // =============================================================================
    
    $(window).on('keydown', function(e) {
        if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
            window.scgEditor.keyboardCallbacks.onkeydown(e);
        }
    });
    
    $(window).on('keyup', function(e) {
        if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
            window.scgEditor.keyboardCallbacks.onkeyup(e);
        }
    });
    
    // =============================================================================
    // EVENT HANDLERS - TODO: Реализовать обработчики событий
    // =============================================================================
    
    /**
     * TODO: Обработка события создания узла
     * editor.on('node:created', function(node) { ... });
     */
    
    /**
     * TODO: Обработка события создания связи
     * editor.on('edge:created', function(edge) { ... });
     */
    
    /**
     * TODO: Обработка события удаления
     * editor.on('objects:deleted', function(objects) { ... });
     */
    
    /**
     * TODO: Обработка события изменения идентификатора
     * editor.on('idtf:changed', function(obj, newIdtf) { ... });
     */
    
    // =============================================================================
    // SAVE/LOAD - TODO: Реализовать сохранение и загрузку
    // =============================================================================
    
    /**
     * Сохранение графа
     * TODO: Подключить к backend API
     */
    window.saveGraph = async function() {
        if (!window.scgEditor) return;
        
        try {
            const graphData = window.scgEditor.scene.exportToJson();
            
            // TODO: Отправить на backend
            const response = await fetch('/api/graph/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphData)
            });
            
            const result = await response.json();
            console.log('[SCg] Граф сохранен:', result);
            return result;
        } catch (error) {
            console.error('[SCg] Ошибка сохранения:', error);
        }
    };
    
    /**
     * Загрузка графа
     * TODO: Подключить к backend API
     */
    window.loadGraph = async function(graphId) {
        if (!window.scgEditor) return;
        
        try {
            // TODO: Получить данные с backend
            const response = await fetch(`/api/graph/load/${graphId || ''}`);
            const graphData = await response.json();
            
            // Импорт в редактор
            window.scgEditor.scene.importFromJson(graphData);
            window.scgEditor.render.update();
            
            console.log('[SCg] Граф загружен');
        } catch (error) {
            console.error('[SCg] Ошибка загрузки:', error);
        }
    };
    
    // =============================================================================
    // UI HANDLERS - TODO: Подключить к кнопкам
    // =============================================================================
    
    // Кнопка сохранения
    $('#btn-save').on('click', function() {
        window.saveGraph();
    });
    
    // Кнопка загрузки
    $('#btn-load').on('click', function() {
        // TODO: Показать модальное окно с списком сохраненных графов
        window.loadGraph();
    });
    
    // Выбор режима редактирования
    $('[data-mode]').on('click', function() {
        const mode = $(this).data('mode');
        
        // TODO: Переключить режим редактора
        // switch(mode) {
        //     case 'select': editor.setMode(SCgEditMode.SCgModeSelect); break;
        //     case 'node': editor.setMode(SCgEditMode.SCgModeNode); break;
        //     // ...
        // }
        
        console.log('[SCg] Переключение в режим:', mode);
    });
    
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * TODO: Обработка ошибок WebSocket подключения
 */
window.addEventListener('error', function(e) {
    console.error('[SCg] Глобальная ошибка:', e.error);
});

/**
 * TODO: Обработка отключения от sc-machine
 */
window.addEventListener('beforeunload', function(e) {
    // TODO: Закрыть соединение WebSocket
    // scClient.disconnect();
});
