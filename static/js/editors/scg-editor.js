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
        // Create container element if not exists
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
        
        // Set DistanceBasedSCgView mode
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
            
            createViewersForScLinks: function(links) {
                console.log('[SCgEditor] sandbox.createViewersForScLinks:', links);
            },
            
            getIdentifier: function(addr, callback) {
                if (callback) callback('');
            },
            
            postLayout: function(scene) {
                if (scene) {
                    scene.updateRender();
                }
            },
            
            layout: function(scene) {
                if (scene) {
                    scene.layout();
                }
            },
            
            resolveElementsAddr: function(addrs, callback) {
                if (callback) callback([]);
            },
            
            eventDataAppend: null,
            eventGetObjectsToTranslate: null,
            eventApplyTranslation: null,
            
            eventStructUpdate: function(triple) {
                console.log('[SCgEditor] sandbox.eventStructUpdate called with:', triple);
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
                        .catch((err) => {
                            console.error('[SCgEditor] Autocomplete error:', err);
                            callback([]);
                        });
                } else {
                    console.warn('[SCgEditor] scClient not ready');
                    callback([]);
                }
            },
            
            window: {
                create: function(options, callback) {
                    console.log('[SCgEditor] window.create:', options);
                }
            }
        };
        
        this.editor = new SCg.Editor();
        this.editor.init({
            sandbox: this.sandbox,
            containerId: this.containerId,
            canEdit: true,
            autocompletionVariants: this.sandbox.autocompletionVariants,
        });
        
        // Set scene reference in sandbox
        this.sandbox.scene = this.editor.scene;
        
        // Initialize DistanceBasedSCgSearcher (wait for SCWeb if needed)
        this._initSearcher();
        
        // Setup double-click handler for neighborhood search
        this._setupDoubleClickHandler();
        
        // Keyboard listeners
        this._keydownHandler = function(d3_event) {
            if (self.editor && self.editor.keyboardCallbacks) {
                self.editor.keyboardCallbacks.onkeydown(d3_event);
            }
        };
        
        this._keyupHandler = function(d3_event) {
            if (self.editor && self.editor.keyboardCallbacks) {
                self.editor.keyboardCallbacks.onkeyup(d3_event);
            }
        };
        
        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
        
        // Initial render
        this.editor.render.update();
        this.editor.scene.layout();
        
        console.log('[SCgEditor] Initialized with container:', this.containerId, 'Mode: DistanceBasedSCgView');
    }
    
    _initSearcher() {
        const tryInit = () => {
            if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.DistanceBasedSCgSearcher) {
                this.searcher = new SCWeb.core.DistanceBasedSCgSearcher(this.sandbox);
                console.log('[SCgEditor] DistanceBasedSCgSearcher initialized');
            } else {
                // Retry after delay if SCWeb not ready yet
                console.log('[SCgEditor] Waiting for SCWeb...');
                setTimeout(tryInit, 500);
            }
        };
        tryInit();
    }
    
    _setupDoubleClickHandler() {
        const container = this.container.querySelector('.scg-viewer');
        if (!container) return;
        
        const self = this;
        
        // Use event delegation for D3 elements
        container.addEventListener('dblclick', function(e) {
            // Find closest element with sc_addr
            let target = e.target;
            while (target && target !== container) {
                const scAddr = target.getAttribute ? target.getAttribute('sc_addr') : null;
                if (scAddr) {
                    console.log('[SCgEditor] Double-click on element with sc_addr:', scAddr);
                    self._searchNeighborhood(parseInt(scAddr));
                    e.stopPropagation();
                    return;
                }
                target = target.parentElement;
            }
        });
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
        
        console.log('[SCgEditor] _clearScene: removing', allObjects.length, 'objects');
        
        allObjects.forEach(obj => {
            scene.removeObject(obj);
        });
        
        scene.clearSelection();
        
        console.log('[SCgEditor] _clearScene: nodes remaining:', scene.nodes ? scene.nodes.length : 0);
    }
    
    _searchNeighborhood(addr) {
        if (!addr || !this.searcher) {
            console.warn('[SCgEditor] Cannot search: no addr or searcher');
            return;
        }
        
        this.currentSearchAddr = new sc.ScAddr(addr);
        this.sandbox.addr = this.currentSearchAddr;
        
        console.log('[SCgEditor] Searching neighborhood for addr:', addr);
        
        // Clear scene before new search
        if (this.editor && this.editor.scene) {
            this._clearScene();
            this.editor.render.update();
        }
        
        // Perform search
        this.searcher.searchContent([this.currentSearchAddr])
            .then((status) => {
                console.log('[SCgEditor] Search completed, status:', status);
                if (this.editor && this.editor.scene) {
                    this.editor.scene.layout();
                    this.editor.render.update();
                }
            })
            .catch((err) => {
                console.error('[SCgEditor] Search error:', err);
            });
    }
    
    _updateContent(keyElement) {
        if (!keyElement || !this.searcher) {
            console.warn('[SCgEditor] updateContent: no keyElement or searcher');
            return;
        }
        
        this.sandbox.addr = keyElement;
        
        // Clear scene
        if (this.editor && this.editor.scene) {
            this._clearScene();
            this.editor.render.update();
        }
        
        // Search and display neighborhood
        this.searcher.searchContent([keyElement])
            .then((status) => {
                console.log('[SCgEditor] updateContent search completed:', status);
                if (this.editor && this.editor.scene) {
                    this.editor.scene.layout();
                    this.editor.render.update();
                }
            })
            .catch((err) => {
                console.error('[SCgEditor] updateContent error:', err);
            });
    }
    
    _handleStructUpdate(triple) {
        console.log('[SCgEditor] _handleStructUpdate called:', triple);
        
        if (!this.editor || !this.editor.scene) {
            console.log('[SCgEditor] No editor or scene');
            return;
        }
        
        const scene = this.editor.scene;
        const addr = triple.sceneElement;
        
        console.log('[SCgEditor] addr:', addr, 'isValid:', addr && addr.isValid ? addr.isValid() : 'N/A');
        
        if (!addr || !addr.isValid()) {
            console.log('[SCgEditor] Invalid addr, skipping');
            return;
        }
        
        const addrValue = addr.value;
        
        // Check if element already exists
        if (scene.getObjectByScAddr(addrValue)) {
            console.log('[SCgEditor] Element already exists:', addrValue);
            return;
        }
        
        // Get element type
        const type = triple.sceneElementType || triple.type;
        const level = triple.sceneElementLevel || triple.level || 0;
        const state = triple.sceneElementState || triple.state;
        
        console.log('[SCgEditor] Adding element:', addrValue, 'type:', type, 'level:', level, 'state:', state);
        console.log('[SCgEditor] SCgObjectCreator:', typeof SCgObjectCreator);
        
        // Create and add object to scene
        try {
            let scType = type;
            console.log('[SCgEditor] Original type:', type, typeof type);
            
            if (typeof scType === 'object' && scType.value) {
                scType = scType.value;
            }
            
            console.log('[SCgEditor] Final scType:', scType, 'hex:', scType ? scType.toString(16) : 'N/A');
            
            // Determine object type and create accordingly
            const scTypeNode = 0x1;
            const scTypeConnector = 0x4000;
            const scTypeLink = 0x2;
            
            console.log('[SCgEditor] Checking type - Node:', (scType & scTypeNode), 'Connector:', (scType & scTypeConnector), 'Link:', (scType & scTypeLink));
            
            if ((scType & scTypeNode) && !(scType & scTypeConnector)) {
                // It's a node
                console.log('[SCgEditor] Creating NODE');
                const obj = SCgObjectCreator.create({
                    type: scType,
                    position: new SCg.Vector3(0, 0, 0),
                    idtf: '',
                    sc_addr: addrValue
                });
                console.log('[SCgEditor] Created node object:', obj);
                if (obj) {
                    obj.setLevel(level);
                    scene.appendObject(obj);
                    console.log('[SCgEditor] Node appended to scene');
                }
            } else if (scType & scTypeConnector) {
                // It's a connector
                console.log('[SCgEditor] Creating CONNECTOR');
                const obj = SCgObjectCreator.create({
                    type: scType,
                    position: new SCg.Vector3(0, 0, 0),
                    idtf: '',
                    sc_addr: addrValue
                });
                console.log('[SCgEditor] Created connector object:', obj);
                if (obj) {
                    obj.setLevel(level);
                    scene.appendObject(obj);
                    console.log('[SCgEditor] Connector appended to scene');
                }
            } else if (scType & scTypeLink) {
                // It's a link
                console.log('[SCgEditor] Creating LINK');
                const obj = SCgObjectCreator.create({
                    type: scType,
                    position: new SCg.Vector3(0, 0, 0),
                    idtf: '',
                    sc_addr: addrValue
                });
                console.log('[SCgEditor] Created link object:', obj);
                if (obj) {
                    obj.setLevel(level);
                    scene.appendObject(obj);
                    console.log('[SCgEditor] Link appended to scene');
                }
            } else {
                console.log('[SCgEditor] Unknown type, skipping');
            }
        } catch (e) {
            console.error('[SCgEditor] Error adding element to scene:', e);
        }
    }
    
    getValue() {
        // Export to GWF format
        if (this.editor && this.editor.scene) {
            return this.editor.scene.exportGWF();
        }
        return '';
    }
    
    setValue(gwfContent) {
        // Load GWF into editor
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
        // Focus on editor
        if (this.editor && this.editor.render && this.editor.render.scene) {
            this.editor.render.scene.canvas.focus();
        }
    }
    
    destroy() {
        // Cleanup keyboard listeners
        if (this._keydownHandler) {
            window.removeEventListener('keydown', this._keydownHandler);
        }
        if (this._keyupHandler) {
            window.removeEventListener('keyup', this._keyupHandler);
        }
    }
    
    // Get the underlying SCg editor instance
    getEditor() {
        return this.editor;
    }
    
    // Set editing mode
    setMode(mode) {
        if (this.editor && this.editor.scene) {
            this.editor.scene.setMode(mode);
        }
    }
    
    // Zoom controls
    zoomIn() {
        if (this.editor && this.editor.render) {
            this.editor.render.zoomIn();
        }
    }
    
    zoomOut() {
        if (this.editor && this.editor.render) {
            this.editor.render.zoomOut();
        }
    }
    
    fitToWindow() {
        if (this.editor && this.editor.render) {
            this.editor.render.fitToWindow();
        }
    }
    
    // Undo/Redo
    undo() {
        if (this.editor && this.editor.commandManager) {
            this.editor.commandManager.undo();
        }
    }
    
    redo() {
        if (this.editor && this.editor.commandManager) {
            this.editor.commandManager.redo();
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SCgEditor;
}
