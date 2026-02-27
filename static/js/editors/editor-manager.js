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
        this.renderTabs();
        this.createEditors();
        this.switchTo(this.currentEditor);
    }

    renderTabs() {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'editor-type-tabs';
        
        tabsContainer.innerHTML = `
            <button class="editor-type-tab active" data-type="scs">ScS</button>
            <button class="editor-type-tab" data-type="scg">SCg</button>
        `;
        
        this.container.appendChild(tabsContainer);
        
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.editor-type-tab');
            if (tab) {
                this.switchTo(tab.dataset.type);
            }
        });
        
        this.tabsContainer = tabsContainer;
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
        editorContainer.style.display = 'none';
        editorContainer.style.width = '100%';
        editorContainer.style.height = '100%';
        editorContainer.style.overflow = 'hidden';
        
        this.contentContainer.appendChild(editorContainer);
        
        this.editors.scg = {
            type: 'scg',
            element: editorContainer,
            instance: null,
            getValue: () => '',
            setValue: () => {},
            focus: () => {},
        };
        
        this._initScgEditor(editorContainer);
    }

    _initScgEditor(container) {
        const tryInit = () => {
            if (typeof SCg !== 'undefined') {
                // Wait for SCWeb to be ready
                if (!window.scWebReady) {
                    console.warn('[EditorManager] SCWeb not ready, waiting...');
                    setTimeout(tryInit, 200);
                    return;
                }
                
                try {
                    const editor = new SCgEditor(container);
                    editor.init();
                    
                    this.editors.scg.instance = editor;
                    this.editors.scg.getValue = () => editor.getValue();
                    this.editors.scg.setValue = (value) => editor.setValue(value);
                    this.editors.scg.focus = () => editor.focus();
                    this.initialized.scg = true;
                    console.log('[EditorManager] SCg editor initialized');
                    
                    if (this.options.onChange) {
                        // SCg doesn't have onChange event, could add later
                    }
                } catch (error) {
                    console.error('[EditorManager] Failed to init SCg:', error);
                    setTimeout(tryInit, 100);
                }
            } else {
                console.warn('[EditorManager] SCg not ready, waiting...');
                setTimeout(tryInit, 100);
            }
        };
        
        tryInit();
    }

    switchTo(type) {
        if (!this.editors[type]) {
            console.warn('[EditorManager] Unknown editor type:', type);
            return;
        }
        
        // Hide current editor
        const current = this.getCurrentEditor();
        if (current && current.element) {
            current.element.style.display = 'none';
        }
        
        // Update tab state
        const tabs = this.tabsContainer.querySelectorAll('.editor-type-tab');
        tabs.forEach(tab => {
            if (tab.dataset.type === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show new editor
        this.currentEditor = type;
        const newEditor = this.getCurrentEditor();
        if (newEditor && newEditor.element) {
            newEditor.element.style.display = 'flex';
            
            // Trigger layout update for SCg
            if (type === 'scg' && newEditor.instance) {
                newEditor.instance.editor.render.update();
                newEditor.instance.editor.scene.layout();
            }
        }
        
        if (this.options.onSwitch) {
            this.options.onSwitch(type);
        }
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
