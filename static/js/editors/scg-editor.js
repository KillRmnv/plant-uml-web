/**
 * SCgEditor - Wrapper for SCg Editor integration into panels
 */

class SCgEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.editor = null;
        this.containerId = 'scg-viewer-' + Math.random().toString(36).substr(2, 9);
        this.sandbox = null;
        this.searcher = null;
        this.currentSearchAddr = null;
    }
    
    init() {
        let viewerContainer = this.container.querySelector('.scg-viewer');
        if (!viewerContainer) {
            viewerContainer = document.createElement('div');
            viewerContainer.className = 'scg-viewer';
            viewerContainer.id = this.containerId;
            this.container.appendChild(viewerContainer);
        } else {
            this.containerId = viewerContainer.id;
        }
        
        const self = this;
        
        if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.Main) {
            SCWeb.core.Main.viewMode = SCgViewMode.DistanceBasedSCgView;
        }
        
        this.sandbox = {
            container: this.containerId,
            addr: new sc.ScAddr(0),
            is_struct: true,
            format_addr: "format_scg_json",
            scene: null,
            
            canEdit: function() { return true; },
            
            updateContent: function(keyElement) {
                self._updateContent(keyElement);
            },
            
            createViewersForScLinks: function(links) {},
            
            getIdentifier: function(addr, callback) {
                if (callback) callback('');
            },
            
            postLayout: function(scene) {
                if (scene) scene.updateRender();
            },
            
            layout: function(scene) {
                if (scene) scene.layout();
            },
            
            resolveElementsAddr: function(addrs, callback) {
                if (callback) callback([]);
            },
            
            eventDataAppend: null,
            eventGetObjectsToTranslate: null,
            eventApplyTranslation: null,
            
            eventStructUpdate: function(triple) {
                self._handleStructUpdate(triple);
            },
            
            autocompletionVariants: function(keyword, callback) {
                if (window.scClient) {
                    window.scClient.searchLinkContentsByContentSubstrings([keyword])
                        .then((strings) => {
                            const maxContentSize = 200;
                            const keys = strings.length && strings[0] 
                                ? strings[0].filter((s) => s.length < maxContentSize) 
                                : [];
                            callback(keys);
                        })
                        .catch(() => callback([]));
                } else {
                    callback([]);
                }
            },
            
            window: {
                create: function() {}
            }
        };
        
        this.editor = new SCg.Editor();
        this.editor.init({
            sandbox: this.sandbox,
            containerId: this.containerId,
            canEdit: true,
            autocompletionVariants: this.sandbox.autocompletionVariants,
        });
        
        this.sandbox.scene = this.editor.scene;
        this._initSearcher();
        
        this._keydownHandler = (d3_event) => {
            if (this.editor && this.editor.keyboardCallbacks) {
                this.editor.keyboardCallbacks.onkeydown(d3_event);
            }
        };
        
        this._keyupHandler = (d3_event) => {
            if (this.editor && this.editor.keyboardCallbacks) {
                this.editor.keyboardCallbacks.onkeyup(d3_event);
            }
        };
        
        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
        
        this.editor.render.update();
        this.editor.scene.layout();
        
        console.log('[SCgEditor] Initialized');
    }
    
    _initSearcher() {
        const tryInit = () => {
            if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.DistanceBasedSCgSearcher) {
                this.searcher = new SCWeb.core.DistanceBasedSCgSearcher(this.sandbox);
                console.log('[SCgEditor] DistanceBasedSCgSearcher initialized');
            } else {
                setTimeout(tryInit, 500);
            }
        };
        tryInit();
    }
    
    _clearScene() {
        if (!this.editor || !this.editor.scene) return;
        
        const scene = this.editor.scene;
        const allObjects = [
            ...(scene.nodes || []),
            ...(scene.links || []),
            ...(scene.connectors || []),
            ...(scene.contours || []),
            ...(scene.buses || [])
        ];
        
        allObjects.forEach(obj => scene.removeObject(obj));
        scene.clearSelection();
    }
    
    _updateContent(keyElement) {
        if (!keyElement || !this.searcher) return;
        
        this.sandbox.addr = keyElement;
        
        if (this.editor && this.editor.scene) {
            this._clearScene();
            this.editor.render.update();
        }
        
        this.searcher.searchContent([keyElement])
            .then((status) => {
                if (this.editor && this.editor.scene) {
                    this.editor.scene.layout();
                    this.editor.render.update();
                }
            })
            .catch((err) => console.error('[SCgEditor] updateContent error:', err));
    }
    
    _handleStructUpdate(triple) {
        if (!this.editor || !this.editor.scene) return;
        
        const scene = this.editor.scene;
        const addr = triple.sceneElement;
        
        if (!addr || !addr.isValid()) return;
        
        const addrValue = addr.value;
        
        if (scene.getObjectByScAddr(addrValue)) return;
        
        const type = triple.sceneElementType || triple.type;
        const level = triple.sceneElementLevel || triple.level || 0;
        
        try {
            let scType = type;
            if (typeof scType === 'object' && scType.value) {
                scType = scType.value;
            }
            
            const scTypeNode = 0x1;
            const scTypeConnector = 0x4000;
            const scTypeLink = 0x2;
            
            let obj = null;
            
            if ((scType & scTypeNode) && !(scType & scTypeConnector)) {
                obj = SCg.Creator.generateNode(scType, new SCg.Vector3(0, 0, 0), '');
                obj.setScAddr(addrValue);
            } else if (scType & scTypeConnector) {
                // Для коннекторов нужно найти source и target
                // Пока просто создаём объект с временными координатами
                obj = SCg.Creator.generateConnector(null, null, scType);
                obj.setScAddr(addrValue);
            } else if (scType & scTypeLink) {
                obj = SCg.Creator.generateLink(scType, new SCg.Vector3(0, 0, 0), this.containerId, '');
                obj.setScAddr(addrValue);
            }
            
            if (obj) {
                obj.setLevel(level);
                scene.appendObject(obj);
            }
        } catch (e) {
            console.error('[SCgEditor] Error adding element:', e);
        }
    }
    
    getValue() {
        if (this.editor && this.editor.scene) {
            return this.editor.scene.exportGWF();
        }
        return '';
    }
    
    setValue(gwfContent) {
        if (gwfContent && this.editor) {
            try {
                this.editor.loadGWF(gwfContent);
                this.editor.render.update();
                this.editor.scene.layout();
            } catch (e) {
                console.error('[SCgEditor] Error loading GWF:', e);
            }
        }
    }
    
    focus() {
        if (this.editor && this.editor.render && this.editor.render.scene) {
            this.editor.render.scene.canvas.focus();
        }
    }
    
    destroy() {
        if (this._keydownHandler) window.removeEventListener('keydown', this._keydownHandler);
        if (this._keyupHandler) window.removeEventListener('keyup', this._keyupHandler);
    }
    
    getEditor() {
        return this.editor;
    }
    
    setMode(mode) {
        if (this.editor && this.editor.scene) {
            this.editor.scene.setMode(mode);
        }
    }
    
    zoomIn() {
        if (this.editor && this.editor.render) this.editor.render.zoomIn();
    }
    
    zoomOut() {
        if (this.editor && this.editor.render) this.editor.render.zoomOut();
    }
    
    fitToWindow() {
        if (this.editor && this.editor.render) this.editor.render.fitToWindow();
    }
    
    undo() {
        if (this.editor && this.editor.commandManager) this.editor.commandManager.undo();
    }
    
    redo() {
        if (this.editor && this.editor.commandManager) this.editor.commandManager.redo();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SCgEditor;
}
