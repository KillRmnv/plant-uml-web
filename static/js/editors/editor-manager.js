/**
 * Editor Manager - Switch between ScS and SCg editors
 */

class EditorManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        
        this.currentEditor = Config.EDITOR.DEFAULT_TYPE;
        this.editors = {};
        
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
        this.container.appendChild(contentContainer);
        
        this.editors.scs = this.createScSEditor();
        this.editors.scg = this.createScgEditor();
        
        this.contentContainer = contentContainer;
    }

    createScSEditor() {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'scs-editor-container';
        editorContainer.style.display = 'none';
        
        editorContainer.innerHTML = `
            <textarea class="scs-textarea" placeholder="Enter ScS code here..."></textarea>
        `;
        
        this.contentContainer.appendChild(editorContainer);
        
        const textarea = editorContainer.querySelector('textarea');
        textarea.addEventListener('input', () => {
            this.options.onChange?.('scs', textarea.value);
        });
        
        return {
            type: 'scs',
            element: editorContainer,
            getValue: () => textarea.value,
            setValue: (value) => { textarea.value = value; },
            focus: () => textarea.focus(),
        };
    }

    createScgEditor() {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'scg-editor-container';
        editorContainer.style.display = 'none';
        
        editorContainer.innerHTML = `
            <div id="scg-viewer"></div>
        `;
        
        this.contentContainer.appendChild(editorContainer);
        
        return {
            type: 'scg',
            element: editorContainer,
            getValue: () => {
                if (window.scgEditor && window.scgEditor.scene) {
                    return window.scgEditor.scene.exportToJson();
                }
                return null;
            },
            setValue: (value) => {
                if (window.scgEditor && window.scgEditor.scene && value) {
                    window.scgEditor.scene.importFromJson(value);
                    window.scgEditor.render.update();
                }
            },
            focus: () => {},
            initScg: () => this.initScgEditor(),
        };
    }

    initScgEditor() {
        const viewerContainer = this.editors.scg.element.querySelector('#scg-viewer');
        
        if (typeof SCg === 'undefined') {
            console.warn('[EditorManager] SCg not loaded yet');
            return;
        }
        
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
        };
        
        try {
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
            
            console.log('[EditorManager] SCg editor initialized');
        } catch (error) {
            console.error('[EditorManager] Failed to initialize SCg:', error);
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
        
        const tabs = this.tabsContainer.querySelectorAll('.editor-type-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === editorType);
        });
        
        if (editorType === 'scg' && !window.scgEditor) {
            this.editors.scg.initScg();
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
