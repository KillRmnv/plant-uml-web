/**
 * SCg Editor - Integration with SCg from sc-web
 */

class ScgEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.editor = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="scg-editor-container">
                <div id="scg-viewer"></div>
            </div>
        `;
    }

    async initScg() {
        const viewerContainer = this.container.querySelector('#scg-viewer');
        
        if (typeof SCg === 'undefined') {
            console.warn('[ScgEditor] SCg not loaded');
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
            this.editor = new SCg.Editor();
            this.editor.init({
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
            
            window.scgEditor = this.editor;
            
            document.addEventListener('keydown', (e) => {
                if (this.editor && this.editor.keyboardCallbacks) {
                    this.editor.keyboardCallbacks.onkeydown(e);
                }
            });
            
            document.addEventListener('keyup', (e) => {
                if (this.editor && this.editor.keyboardCallbacks) {
                    this.editor.keyboardCallbacks.onkeyup(e);
                }
            });
            
            console.log('[ScgEditor] SCg editor initialized');
        } catch (error) {
            console.error('[ScgEditor] Failed to initialize SCg:', error);
        }
    }

    getValue() {
        if (this.editor && this.editor.scene) {
            return this.editor.scene.exportToJson();
        }
        return null;
    }

    setValue(value) {
        if (this.editor && this.editor.scene && value) {
            this.editor.scene.importFromJson(value);
            this.editor.render.update();
        }
    }

    focus() {}

    clear() {
        if (this.editor && this.editor.scene) {
            this.editor.scene.clear();
            this.editor.render.update();
        }
    }

    on(event, callback) {
        if (this.editor) {
            this.editor.on(event, callback);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScgEditor;
}
