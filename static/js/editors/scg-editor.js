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
        
        this.viewerContainer = this.container.querySelector('#scg-viewer');
        
        if (typeof SCg === 'undefined') {
            this._showLoading();
            return;
        }
        
        this._initScg();
    }

    _showLoading() {
        this.viewerContainer.innerHTML = `
            <div class="scg-editor-loading">
                <div class="loading-spinner"></div>
                <span>Loading SCg Editor...</span>
            </div>
        `;
    }

    _initScg() {
        const self = this;
        
        const sandbox = {
            container: 'scg-viewer',
            addr: 0,
            is_struct: false,
            format_addr: 'format_scg_json',
            resolveElementsAddr: async (identifiers) => {
                console.log('[SCg] Resolving identifiers:', identifiers);
                
                if (!window.scClient) {
                    console.warn('[SCg] scClient not available');
                    return {};
                }
                
                try {
                    const keynodesData = identifiers.map(id => ({ id: id, type: new sc.ScType() }));
                    const result = await window.scClient.resolveKeynodes(keynodesData);
                    
                    const resolved = {};
                    for (const id of identifiers) {
                        if (result[id] && result[id].value) {
                            resolved[id] = result[id].value;
                        }
                    }
                    console.log('[SCg] Resolved:', resolved);
                    return resolved;
                } catch (error) {
                    console.error('[SCg] Error resolving identifiers:', error);
                    return {};
                }
            },
            canEdit: () => true,
            createViewersForScLinks: (links) => {
                console.log('[SCg] Create viewers for links:', links);
                // TODO: Implement sc-link viewers if needed
            },
        };

        try {
            this.editor = new SCg.Editor();
            this.editor.init({
                containerId: 'scg-viewer',
                canEdit: true,
                sandbox: sandbox,
                autocompletionVariants: async (keyword, callback) => {
                    console.log('[SCg] Autocompletion for:', keyword);
                    
                    if (!window.scClient) {
                        callback([]);
                        return;
                    }
                    
                    try {
                        // Search for links containing the keyword
                        const results = await window.scClient.searchLinksByContents([keyword]);
                        const suggestions = [];
                        
                        for (const [addr, content] of Object.entries(results)) {
                            suggestions.push({
                                id: addr,
                                label: content,
                            });
                        }
                        
                        callback(suggestions);
                    } catch (error) {
                        console.error('[SCg] Autocompletion error:', error);
                        callback([]);
                    }
                },
                translateToSc: async (callback) => {
                    console.log('[SCg] Translating to SC');
                    
                    if (!window.scClient) {
                        callback({});
                        return;
                    }
                    
                    try {
                        // Export scene to SCn format via sc-server
                        // This is a simplified version - full implementation would use sc-struct
                        const json = self.editor.scene.exportToJson();
                        
                        // For now, return empty - full implementation would create
                        // SCn construction in the knowledge base
                        console.log('[SCg] Exported JSON:', json);
                        callback({});
                    } catch (error) {
                        console.error('[SCg] Translation error:', error);
                        callback({});
                    }
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

            this.editor.render.update();
            this.editor.scene.layout();

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
            try {
                this.editor.scene.importFromJson(value);
                this.editor.render.update();
                this.editor.scene.layout();
            } catch (error) {
                console.error('[ScgEditor] Failed to set value:', error);
            }
        }
    }

    focus() {
        if (this.editor && this.editor.render) {
            this.editor.render.container.focus();
        }
    }

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

    updateOptions(options) {
        // SCg editor doesn't support dynamic options update
    }

    dispose() {
        if (this.editor) {
            this.editor = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScgEditor;
}
