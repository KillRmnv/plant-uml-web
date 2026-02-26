/**
 * =============================================================================
 * Editor Manager - Documentation
 * =============================================================================
 * 
 * Назначение:
 * -----------
 * Управляет переключением между ScS-редактором и SCg-редактором.
 * Создает и инициализирует оба редактора, предоставляет единый интерфейс
 * для работы с ними.
 * 
 * Основные функции:
 * ---------------
 * 1. Создание контейнеров для редакторов
 * 2. Инициализация ScS-редактора (Monaco)
 * 3. Инициализация SCg-редактора (визуальный граф)
 * 4. Переключение между редакторами
 * 5. Поиск в базе знаний через SCg
 * 
 * Архитектура:
 * ------------
 * - EditorManager создает два редактора: ScS и SCg
 * - ScS использует Monaco Editor для текстового редактирования
 * - SCg использует SCg.Editor для визуального редактирования графов
 * - Переключение происходит через switchTo(type)
 * 
 * Sandbox для SCg:
 * ----------------
 * При инициализации SCg создается sandbox-объект с callback-ами:
 * - resolveElementsAddr: преобразование идентификаторов в sc-адреса
 * - getIdentifier: получение идентификатора по sc-адресу
 * - eventStructUpdate: callback при изменении структуры
 * - updateContent: загрузка контента по ключевому элементу
 * 
 * Интеграция поиска:
 * ------------------
 * - При вводе в поле поиска и нажатии Enter вызывается SCgNeighborhoodSearch
 * - SCgNeighborhoodSearch.search(query) запускает поиск
 * - Результаты отображаются на сцене SCg
 * 
 * =============================================================================
 */

/**
 * =============================================================================
 * EditorManager
 * =============================================================================
 * 
 * Основной класс управления редакторами.
 * 
 * @param {HTMLElement} container - DOM-контейнер для редакторов
 * @param {Object} options - Настройки (onChange, onSwitch callback-и)
 */
class EditorManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        
        this.currentEditor = Config.EDITOR.DEFAULT_TYPE || 'scs';
        this.editors = {};
        this.initialized = {
            scs: false,
            scg: false
        };
        
        this.init();
    }

    init() {
        this.createSearchContainer();
        this.createEditors();
        this.switchTo(this.currentEditor);
    }

    createSearchContainer() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'editor-search-container';
        searchContainer.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 16px;
            border-bottom: 1px solid var(--border-color);
            background: var(--surface-color);
            gap: 8px;
        `;
        
        searchContainer.innerHTML = `
            <input type="text" 
                   id="scg-search-input-panel" 
                   class="typeahead form-control"
                   placeholder="Search in knowledge base..."
                   style="width: 100%; flex: 1;">
        `;
        
        this.container.appendChild(searchContainer);
        
        // Add Enter key handler for search (using keypress to match typeahead behavior)
        const searchInput = document.getElementById('scg-search-input-panel');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.which === 13) {
                e.preventDefault();
                e.stopPropagation();
                const query = searchInput.value.trim();
                console.log('[EditorManager] Enter pressed, query:', query);
                if (query && this.editors.scg && this.editors.scg.search) {
                    console.log('[EditorManager] Calling search.search()...');
                    this.editors.scg.search.search(query);
                } else if (!this.editors.scg?.search) {
                    console.warn('[EditorManager] Search not available yet');
                }
            }
        });
        console.log('[EditorManager] Search input handler attached');
    }

    createEditors() {
        const contentContainer = document.createElement('div');
        contentContainer.className = 'panel-content';
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'column';
        contentContainer.style.flex = '1';
        contentContainer.style.minHeight = '0';
        this.container.appendChild(contentContainer);
        
        this.contentContainer = contentContainer;
        
        this.createScSEditorContainer();
        this.createScgEditorContainer();
    }

    createScSEditorContainer() {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'scs-editor-wrapper';
        editorContainer.style.display = 'flex';
        editorContainer.style.flexDirection = 'column';
        editorContainer.style.flex = '1';
        editorContainer.style.minHeight = '0';
        editorContainer.style.width = '100%';
        editorContainer.style.height = '100%';
        editorContainer.style.overflow = 'hidden';
        editorContainer.style.display = 'none';
        
        this.contentContainer.appendChild(editorContainer);
        
        this.editors.scs = {
            type: 'scs',
            element: editorContainer,
            instance: null,
            getValue: () => '',
            setValue: () => {},
            focus: () => {},
        };
        
        this._initScsEditorWhenReady(editorContainer);
    }

    _initScsEditorWhenReady(container) {
        const tryInit = () => {
            if (typeof monaco !== 'undefined') {
                try {
                    // Temporarily show container for Monaco to calculate dimensions
                    container.style.display = 'flex';
                    container.style.visibility = 'hidden';
                    
                    const editor = new ScsEditor(container);
                    
                    // After Monaco is created, restore visibility
                    requestAnimationFrame(() => {
                        container.style.visibility = 'visible';
                        if (editor.editor) {
                            editor.editor.layout();
                        }
                    });
                    
                    this.editors.scs.instance = editor;
                    this.editors.scs.getValue = () => editor.getValue();
                    this.editors.scs.setValue = (value) => editor.setValue(value);
                    this.editors.scs.focus = () => editor.focus();
                    this.initialized.scs = true;
                    console.log('[EditorManager] ScS editor initialized');
                    
                    if (this.options.onChange) {
                        editor.editor.onDidChangeModelContent(() => {
                            this.options.onChange('scs', editor.getValue());
                        });
                    }
                } catch (error) {
                    console.error('[EditorManager] Failed to init ScS:', error);
                    setTimeout(tryInit, 100);
                }
            } else {
                setTimeout(tryInit, 100);
            }
        };
        
        tryInit();
    }

    createScgEditorContainer() {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'scg-editor-wrapper';
        editorContainer.style.display = 'flex';
        editorContainer.style.flexDirection = 'column';
        editorContainer.style.flex = '1';
        editorContainer.style.minHeight = '0';
        editorContainer.style.display = 'none';
        
        this.contentContainer.appendChild(editorContainer);
        
        this.editors.scg = {
            type: 'scg',
            element: editorContainer,
            instance: null,
            getValue: () => '',
            setValue: () => {},
            focus: () => {},
            initScg: () => this._initScgEditor(editorContainer),
        };
    }

    _initScgEditor(container) {
        if (this.initialized.scg) return;
        
        if (typeof SCg === 'undefined') {
            console.warn('[EditorManager] SCg not loaded yet, retrying...');
            setTimeout(() => this._initScgEditor(container), 100);
            return;
        }
        
        try {
            const editorContainer = document.createElement('div');
            editorContainer.id = 'scg-viewer';
            editorContainer.style.width = '100%';
            editorContainer.style.height = '100%';
            container.appendChild(editorContainer);
            
            const sandbox = {
                container: 'scg-viewer',
                addr: new sc.ScAddr(),
                is_struct: true,
                format_addr: 'format_scg_json',
                eventStructUpdate: null,
                layout: (scene) => {
                    if (scene && typeof scene.layout === 'function') {
                        scene.layout();
                    }
                },
                postLayout: (scene) => {
                    if (scene && typeof scene.updateRender === 'function') {
                        scene.updateRender();
                    }
                },
                onceUpdatableObjects: {},
                resolveElementsAddr: async (identifiers) => {
                    if (!window.scClient) return {};
                    try {
                        const keynodesData = identifiers.map(id => ({ id: id, type: new sc.ScType() }));
                        const result = await window.scClient.resolveKeynodes(keynodesData);
                        const resolved = {};
                        for (const id of identifiers) {
                            if (result[id] && result[id].value) {
                                resolved[id] = result[id].value;
                            }
                        }
                        return resolved;
                    } catch (error) {
                        console.error('[SCg] Error resolving identifiers:', error);
                        return {};
                    }
                },
                canEdit: () => true,
                createViewersForScLinks: (links) => {},
                getIdentifier: function (addr, callback) {
                    if (!addr) {
                        callback('');
                        return;
                    }
                    
                    const addrValue = addr.value || addr;
                    const numericAddr = typeof addrValue === 'number' ? addrValue : parseInt(addrValue);
                    
                    if (SCWeb && SCWeb.core && SCWeb.core.Server) {
                        SCWeb.core.Server.resolveIdentifiers([numericAddr]).then((idtfs) => {
                            callback(idtfs[numericAddr] || '');
                        }).catch(() => {
                            callback('');
                        });
                    } else {
                        callback('');
                    }
                },
                updateContent: async (keyElement) => {
                    console.log('[SCg] updateContent called with:', keyElement?.value);
                    // Пытаемся использовать searcher из SCgNeighborhoodSearch
                    const search = this.editors.scg?.search;
                    if (search?.searcher) {
                        try {
                            const keyElements = keyElement ? [keyElement] : null;
                            await search.searcher.searchContent(keyElements);
                            console.log('[SCg] updateContent completed');
                        } catch (error) {
                            console.error('[SCg] updateContent error:', error);
                        }
                    } else {
                        console.warn('[SCg] updateContent: searcher not available');
                    }
                },
            };
            
            const editor = new SCg.Editor();
            editor.init({
                containerId: 'scg-viewer',
                canEdit: true,
                sandbox: sandbox,
                autocompletionVariants: (keyword, callback) => {
                    callback([]);
                },
                translateToSc: (callback) => {
                    callback({});
                },
            });
            
            window.scgEditor = editor;
            
            document.addEventListener('keydown', (e) => {
                if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
                    window.scgEditor.keyboardCallbacks.onkeydown(e);
                }
            });
            
            document.addEventListener('keyup', (e) => {
                if (window.scgEditor && window.scgEditor.keyboardCallbacks) {
                    window.scgEditor.keyboardCallbacks.onkeyup(e);
                }
            });
            
            this.editors.scg.instance = editor;
            
            // Initialize neighborhood search
            console.log('[EditorManager] Initializing neighborhood search...');
            if (window.SCgNeighborhoodSearch) {
                console.log('[EditorManager] Creating SCgNeighborhoodSearch instance...');
                const search = new window.SCgNeighborhoodSearch(editor, sandbox);
                console.log('[EditorManager] Calling search.init()...');
                search.init();
                this.editors.scg.search = search;
                console.log('[EditorManager] ✓ Neighborhood search ready');
            } else {
                console.warn('[EditorManager] SCgNeighborhoodSearch not found, will retry...');
                setTimeout(() => {
                    if (window.SCgNeighborhoodSearch) {
                        const search = new window.SCgNeighborhoodSearch(editor, sandbox);
                        search.init();
                        this.editors.scg.search = search;
                        console.log('[EditorManager] ✓ Neighborhood search ready (delayed)');
                    }
                }, 500);
            }
            
            this.editors.scg.getValue = () => {
                if (editor.scene) {
                    return editor.scene.exportToJson();
                }
                return null;
            };
            this.editors.scg.setValue = (value) => {
                if (editor.scene && value) {
                    editor.scene.importFromJson(value);
                    editor.render.update();
                }
            };
            this.editors.scg.focus = () => {
                if (editor.render) {
                    editor.render.container.focus();
                }
            };
            
            this.initialized.scg = true;
            console.log('[EditorManager] SCg editor initialized');
            
        } catch (error) {
            console.error('[EditorManager] Failed to init SCg:', error);
            setTimeout(() => this._initScgEditor(container), 100);
        }
    }

    switchTo(editorType) {
        if (!this.editors[editorType]) {
            console.error(`[EditorManager] Unknown editor type: ${editorType}`);
            return;
        }
        
        this.currentEditor = editorType;
        
        Object.keys(this.editors).forEach(type => {
            const editor = this.editors[type];
            editor.element.style.display = type === editorType ? 'flex' : 'none';
        });
        
        // tabs removed - switching via toolbar buttons
        // const tabs = this.tabsContainer.querySelectorAll('.editor-type-tab');
        // tabs.forEach(tab => {
        //     tab.classList.toggle('active', tab.dataset.type === editorType);
        // });
        
        if (editorType === 'scg' && !this.initialized.scg) {
            this.editors.scg.initScg();
        }
        
        if (editorType === 'scs' && !this.initialized.scs) {
            // Show container first, then initialize Monaco
            this.editors.scs.element.style.display = 'flex';
            setTimeout(() => {
                if (this.editors.scs.instance && this.editors.scs.instance.editor) {
                    this.editors.scs.instance.editor.layout();
                }
            }, 100);
        }
        
        // Trigger layout update for Monaco editor when switching
        if (editorType === 'scs' && this.initialized.scs && this.editors.scs.instance && this.editors.scs.instance.editor) {
            setTimeout(() => {
                this.editors.scs.instance.editor.layout();
            }, 50);
        }
        
        this.options.onSwitch?.(editorType);
    }

    getCurrentEditor() {
        return this.editors[this.currentEditor];
    }

    getValue() {
        return this.getCurrentEditor().getValue();
    }

    setValue(value) {
        const editor = this.getCurrentEditor();
        editor.setValue(value);
    }

    focus() {
        this.getCurrentEditor().focus();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorManager;
}
