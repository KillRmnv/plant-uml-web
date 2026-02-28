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
            scweb: false
        };
        
        this.init();
    }

    init() {
        this.createEditors();
        this.switchTo(this.currentEditor);
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
        this.createScWebEditorContainer();
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

    createScWebEditorContainer() {
        const container = document.createElement('div');
        container.className = 'scweb-editor-wrapper';
        container.style.display = 'none';
        container.style.width = '100%';
        container.style.height = '100%';
        
        const iframe = document.createElement('iframe');
        iframe.src = 'sc-web-iframe.html';
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        
        container.appendChild(iframe);
        this.contentContainer.appendChild(container);
        
        this.editors.scweb = {
            type: 'scweb',
            element: container,
            instance: iframe,
            getValue: () => '',
            setValue: () => {},
            focus: () => {}
        };
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
        
        // Show new editor
        this.currentEditor = type;
        const newEditor = this.getCurrentEditor();
        if (newEditor && newEditor.element) {
            newEditor.element.style.display = 'flex';
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
