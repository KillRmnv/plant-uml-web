/**
 * Editor Manager - Switch between ScS and SCg editors
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
        
        // Initialize search when SCg editor is ready
        setTimeout(() => {
            if (typeof SCgSearch !== 'undefined' && window.scgEditor) {
                // Update search input reference
                const searchInput = document.getElementById('scg-search-input-panel');
                if (searchInput && !searchInput.dataset.initialized) {
                    searchInput.dataset.initialized = 'true';
                    console.log('[EditorManager] Search container created');
                }
            }
        }, 500);
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
                addr: 0,
                is_struct: false,
                format_addr: 'format_scg_json',
                resolveElementsAddr: async (identifiers) => {
                    console.log('[SCg] Resolving:', identifiers);
                    return {};
                },
                canEdit: () => true,
                createViewersForScLinks: (links) => {},
                updateContent: (addr) => {
                    console.log('[SCg] updateContent called', addr);
                },
                getIdentifier: (addr, callback) => {
                    callback('');
                },
                postLayout: (scene) => {},
                layout: (scene) => {},
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
            
            // Initialize search integration
            console.log('[EditorManager] Checking SCSearchIntegration:', typeof window.SCSearchIntegration);
            if (window.SCSearchIntegration) {
                console.log('[EditorManager] Calling SCSearchIntegration.init()');
                window.SCSearchIntegration.init(editor);
                console.log('[EditorManager] SCSearchIntegration.init() called');
            } else {
                console.error('[EditorManager] SCSearchIntegration not found!');
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
            
            // Initialize search functionality
            if (typeof SCgSearch !== 'undefined') {
                SCgSearch.init(editor);
                console.log('[EditorManager] SCg search initialized');
            }
            
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
