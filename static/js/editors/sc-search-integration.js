/**
 * SC Search Integration - Full integration with sc-web approach
 * Uses DistanceBasedSCgSearcher and SCgStructTranslator from sc-web
 */

const SCSearchIntegration = {
    editor: null,
    sandbox: null,
    searcher: null,
    translator: null,
    maxElements: 10,  // Maximum elements to load (try 3-10 for testing)

    init: function(editor) {
        this.editor = editor;
        
        // Listen for search selection events
        window.addEventListener('scSearchSelect', async (event) => {
            console.log('[SCSearchIntegration] Received search select:', event.detail);
            await this.search(event.detail.addr, event.detail.identifier);
        });
        
        console.log('[SCSearchIntegration] Initialized');
    },

    /**
     * Resolve identifier for an object
     */
    _resolveIdtf: function(obj, addr) {
        if (this.sandbox && this.sandbox.getIdentifier) {
            this.sandbox.getIdentifier(addr, function(idtf) {
                if (idtf) {
                    obj.setText(idtf);
                    console.log('[SCSearchIntegration] Set identifier for', addr, ':', idtf);
                }
            });
        }
    },

    /**
     * Perform search for a given address
     */
    search: async function(addr, identifier) {
        console.log('[SCSearchIntegration] search() called with addr:', addr, 'identifier:', identifier);
        
        if (!this.editor) {
            console.error('[SCSearchIntegration] Editor is null!');
            return;
        }
        if (!this.editor.scene) {
            console.error('[SCSearchIntegration] Editor.scene is null!');
            return;
        }
        if (!window.scClient) {
            console.error('[SCSearchIntegration] scClient is null!');
            return;
        }

        console.log('[SCSearchIntegration] All checks passed, starting search...');
        
        const addrNum = parseInt(addr);
        
        // Clear existing content
        this._clearScene();
        
        // Create sandbox for this search
        this._createSandbox(addrNum);
        
        // Initialize translator
        this._initTranslator();
        
        // Initialize and run searcher
        await this._runSearch(addrNum);
    },

    /**
     * Clear the scene
     */
    _clearScene: function() {
        const scene = this.editor.scene;
        
        // Delete all objects
        const objectsToDelete = [];
        if (scene.nodes) objectsToDelete.push(...scene.nodes);
        if (scene.connectors) objectsToDelete.push(...scene.connectors);
        if (scene.links) objectsToDelete.push(...scene.links);
        if (scene.contours) objectsToDelete.push(...scene.contours);
        
        scene.deleteObjects(objectsToDelete);
        
        // Clear objects map
        if (scene.objects) {
            scene.objects = {};
        }
        
        this.editor.render.update();
        console.log('[SCSearchIntegration] Scene cleared');
    },

    /**
     * Create sandbox object
     */
    _createSandbox: function(addr) {
        const self = this;
        
        this.sandbox = {
            addr: new sc.ScAddr(addr),
            
            // Event handlers
            eventStructUpdate: function(data) {
                if (self.translator && self.translator.updateFromSc) {
                    self.translator.updateFromSc(data);
                }
            },
            
            layout: function(scene) {
                scene.layout();
            },
            
            postLayout: function(scene) {
                self.editor.render.update();
            },
            
            getIdentifier: function(addr, callback) {
                // addr can be string or number
                const addrStr = addr.toString();
                console.log('[SCSearchIntegration] Resolving identifier for:', addrStr);
                
                if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.Server) {
                    SCWeb.core.Server.resolveIdentifiers([addrStr]).then(function(idtfs) {
                        const idtf = idtfs[addrStr] || '';
                        console.log('[SCSearchIntegration] Got identifier for', addrStr, ':', idtf);
                        callback(idtf);
                    }).catch(function(err) {
                        console.error('[SCSearchIntegration] Error resolving identifier:', err);
                        callback('');
                    });
                } else {
                    console.warn('[SCSearchIntegration] SCWeb.core.Server not available');
                    callback('');
                }
            },
            
            // For search
            updateContent: function() {
                // Already handled by our search
            }
        };
        
        console.log('[SCSearchIntegration] Sandbox created for addr:', addr);
    },

    /**
     * Initialize the translator
     */
    _initTranslator: function() {
        const self = this;
        
        // Create a simplified version of SCgStructFromScTranslatorImpl
        this.translator = {
            _editor: this.editor,
            _sandbox: this.sandbox,
            _elements: new Map(),
            _appendTasks: [],
            _removeTasks: [],
            _maxBatch: 50,
            _batchDelay: 100,
            _timer: null,
            
            updateFromSc: async function(data) {
                await this._processUpdate(data);
                this._scheduleFlush();
            },
            
            _processUpdate: async function(data) {
                const scene = this._editor.scene;
                const sceneElementState = data.sceneElementState;
                const isAdded = sceneElementState !== SCgObjectState.RemovedFromMemory;
                
                if (!isAdded) {
                    // Handle removal
                    const addr = data.sceneElement.value;
                    const obj = scene.getObjectByScAddr(addr);
                    if (obj) {
                        scene.deleteObjects([obj]);
                    }
                    return;
                }
                
                // Get element type
                let sceneElementType = data.sceneElementType;
                if (!sceneElementType) {
                    const types = await scClient.getElementsTypes([data.sceneElement]);
                    sceneElementType = types[0];
                }
                
                const type = sceneElementType.value;
                const level = data.sceneElementLevel || SCgObjectLevel.First;
                
                // Handle connector (has source and target)
                if (data.sceneElementSource && data.sceneElementTarget) {
                    const sourceAddr = data.sceneElementSource.value;
                    const targetAddr = data.sceneElementTarget.value;
                    
                    // Add source node if not exists
                    if (!scene.getObjectByScAddr(sourceAddr)) {
                        const sourceType = data.sceneElementSourceType ? data.sceneElementSourceType.value : sc_type_node;
                        self._addNode(sourceAddr, sourceType, level, sceneElementState);
                    }
                    
                    // Add target node if not exists  
                    if (!scene.getObjectByScAddr(targetAddr)) {
                        const targetType = data.sceneElementTargetType ? data.sceneElementTargetType.value : sc_type_node;
                        self._addNode(targetAddr, targetType, level, sceneElementState);
                    }
                    
                    // Add connector
                    self._addConnector(
                        data.sceneElement.value,
                        type,
                        sourceAddr,
                        targetAddr,
                        level,
                        sceneElementState
                    );
                }
                // Handle connector found directly
                else if (sceneElementType.isConnector && sceneElementType.isConnector()) {
                    try {
                        const [source, target] = await window.scHelper.getConnectorElements(data.sceneElement);
                        if (source.isValid() && target.isValid()) {
                            // Add source and target nodes
                            const sourceType = (await scClient.getElementsTypes([source]))[0];
                            const targetType = (await scClient.getElementsTypes([target]))[0];
                            
                            if (!scene.getObjectByScAddr(source.value)) {
                                self._addNode(source.value, sourceType.value, level, sceneElementState);
                            }
                            if (!scene.getObjectByScAddr(target.value)) {
                                self._addNode(target.value, targetType.value, level, sceneElementState);
                            }
                            
                            self._addConnector(
                                data.sceneElement.value,
                                type,
                                source.value,
                                target.value,
                                level,
                                sceneElementState
                            );
                        }
                    } catch (e) {
                        console.log('[SCSearchIntegration] Error getting connector elements:', e);
                    }
                }
                // Handle node/link
                else {
                    self._addNode(data.sceneElement.value, type, level, sceneElementState);
                }
            },
            
            _addNode: function(addr, type, level, state) {
                const scene = this.editor.scene;
                
                // Debug logging
                console.log('[SCSearchIntegration] _addNode called:', {
                    addr: addr,
                    type: type,
                    typeIsNumber: typeof type === 'number',
                    level: level,
                    state: state
                });
                
                // Ensure type is a number
                const typeNum = typeof type === 'number' ? type : (type.value || 0);
                
                // Check if already exists
                if (scene.getObjectByScAddr(addr)) {
                    return;
                }
                
                // Generate random position
                const posX = 100 * Math.random();
                const posY = 100 * Math.random();
                
                // Debug: check if SCg.Vector3 is defined
                if (typeof SCg === 'undefined' || !SCg.Vector3) {
                    console.error('[SCSearchIntegration] SCg.Vector3 is NOT defined!');
                }
                if (typeof SCg.Creator === 'undefined' || !SCg.Creator.generateNode) {
                    console.error('[SCSearchIntegration] SCg.Creator.generateNode is NOT defined!');
                }
                
                const pos = new SCg.Vector3(posX, posY, 0);
                console.log('[SCSearchIntegration] Creating node at:', posX, posY, 'Vector3:', pos.x, pos.y, pos.z);
                
                // Determine if it's a link or node
                if ((typeNum & sc_type_node_link) === sc_type_node_link) {
                    // It's a link
                    const containerId = 'scg-link-' + addr;
                    const obj = SCg.Creator.generateLink(
                        typeNum,
                        pos,
                        containerId,
                        ''
                    );
                    if (obj) {
                        obj.setLevel(level);
                        obj.setObjectState(state);
                        scene.appendObject(obj);
                        obj.setScAddr(addr);
                        self._resolveIdtf(obj, addr);
                        console.log('[SCSearchIntegration] Link created:', addr);
                    } else {
                        console.error('[SCSearchIntegration] Failed to create link:', addr);
                    }
                } else if (typeNum & sc_type_node) {
                    // It's a node
                    const obj = SCg.Creator.generateNode(
                        typeNum,
                        pos,
                        ''
                    );
                    if (obj) {
                        obj.setLevel(level);
                        obj.setObjectState(state);
                        scene.appendObject(obj);
                        obj.setScAddr(addr);
                        self._resolveIdtf(obj, addr);
                        console.log('[SCSearchIntegration] Node created:', addr, 'type:', typeNum, 'pos:', obj.position ? obj.position.x + ',' + obj.position.y : 'NO POS');
                    } else {
                        console.error('[SCSearchIntegration] Failed to create node:', addr);
                    }
                }
            },
            
            _addConnector: function(addr, type, sourceAddr, targetAddr, level, state) {
                const scene = this.editor.scene;
                
                // Ensure type is a number
                const typeNum = typeof type === 'number' ? type : (type.value || sc_type_arc_common);
                
                console.log('[SCSearchIntegration] _addConnector:', {
                    addr: addr,
                    sourceAddr: sourceAddr,
                    targetAddr: targetAddr,
                    type: typeNum
                });
                
                let sourceObj = scene.getObjectByScAddr(sourceAddr);
                let targetObj = scene.getObjectByScAddr(targetAddr);
                
                console.log('[SCSearchIntegration] Connector source pos:', sourceObj && sourceObj.position ? sourceObj.position.x + ',' + sourceObj.position.y : 'NO POS');
                console.log('[SCSearchIntegration] Connector target pos:', targetObj && targetObj.position ? targetObj.position.x + ',' + targetObj.position.y : 'NO POS');
                
                if (!sourceObj || !targetObj) {
                    console.warn('[SCSearchIntegration] Cannot create connector: endpoints not found', sourceAddr, targetAddr);
                    return;
                }
                
                // Check if already exists
                if (scene.getObjectByScAddr(addr)) {
                    return;
                }
                
                // Handle self-loop: create a copy of the object
                if (sourceAddr === targetAddr) {
                    console.log('[SCSearchIntegration] Self-loop detected, creating copy');
                    
                    // Check for existing connectors to this node
                    const existingConnectors = scene.connectors.filter(c => c.source === targetObj || c.target === targetObj);
                    
                    // Create a copy with offset position
                    const copyPos = new SCg.Vector3(
                        targetObj.position.x + 30 + existingConnectors.length * 20,
                        targetObj.position.y + 30 + existingConnectors.length * 20,
                        0
                    );
                    
                    // Create new node as copy
                    const copyObj = SCg.Creator.generateNode(targetObj.sc_type, copyPos, '');
                    copyObj.setLevel(level);
                    copyObj.setObjectState(state);
                    scene.appendObject(copyObj);
                    const copyAddr = targetAddr + '_copy_' + existingConnectors.length;
                    copyObj.setScAddr(copyAddr);
                    
                    // Resolve identifier for copy node
                    self._resolveIdtf(copyObj, targetAddr);
                    
                    console.log('[SCSearchIntegration] Created copy node at:', copyPos.x, copyPos.y);
                    
                    // Use copy as target
                    targetObj = copyObj;
                }
                
                const connector = SCg.Creator.generateConnector(sourceObj, targetObj, typeNum);
                if (connector) {
                    connector.setLevel(level);
                    connector.setObjectState(state);
                    scene.appendObject(connector);
                    connector.setScAddr(addr);
                    console.log('[SCSearchIntegration] Connector created:', addr);
                } else {
                    console.error('[SCSearchIntegration] Failed to create connector:', addr);
                }
            },
            
            _scheduleFlush: function() {
                if (this._timer) return;
                
                const self = this;
                this._timer = setTimeout(function() {
                    self._timer = null;
                    self._flush();
                }, this._batchDelay);
            },
            
            _flush: function() {
                console.log('[SCSearchIntegration] _flush called - nodes:', this._editor.scene.nodes.length, 'connectors:', this._editor.scene.connectors.length);
                this._editor.scene.layout();
                this._editor.render.update();
                console.log('[SCSearchIntegration] _flush complete');
            }
        };
        
        console.log('[SCSearchIntegration] Translator initialized');
    },

    /**
     * Run the search using DistanceBasedSCgSearcher approach
     */
    _runSearch: async function(addrNum) {
        const self = this;
        const scAddr = new sc.ScAddr(addrNum);
        
        try {
            console.log('[SCSearchIntegration] Starting search for addr:', addrNum);
            
            // Search all elements connected to our address
            await this._searchConnectedElements(scAddr);
            
            // Final layout update
            console.log('[SCSearchIntegration] Before layout - checking node positions:');
            this.editor.scene.nodes.forEach((node, i) => {
                console.log(`  Node ${i}: addr=${node.sc_addr}, pos=${node.position ? node.position.x + ',' + node.position.y : 'NO POSITION'}`);
            });
            
            this.editor.scene.layout();
            this.editor.render.update();
            
            console.log('[SCSearchIntegration] After layout and update - checking node positions:');
            this.editor.scene.nodes.forEach((node, i) => {
                console.log(`  Node ${i}: addr=${node.sc_addr}, pos=${node.position ? node.position.x + ',' + node.position.y : 'NO POSITION'}`);
            });
            console.log('[SCSearchIntegration] After layout - checking connectors:');
            this.editor.scene.connectors.forEach((conn, i) => {
                const src = conn.source ? `src=${conn.source.position ? conn.source.position.x : '?'}` : 'no src';
                const tgt = conn.target ? `tgt=${conn.target.position ? conn.target.position.x : '?'}` : 'no tgt';
                console.log(`  Connector ${i}: ${src}, ${tgt}`);
            });
            
            console.log('[SCSearchIntegration] Search complete');
            
            // Navigate to the main node
            const mainNode = this.editor.scene.getObjectByScAddr(addrNum);
            if (mainNode) {
                this._navigateToNode(mainNode);
            }
            
        } catch (error) {
            console.error('[SCSearchIntegration] Search error:', error);
        }
    },

    /**
     * Search connected elements (simplified version of DistanceBasedSCgSearcher)
     */
    _searchConnectedElements: async function(mainAddr) {
        const visited = new Set();
        const queue = [mainAddr];
        let count = 0;
        
        while (queue.length > 0 && count < this.maxElements) {
            const current = queue.shift();
            const currentHash = current.value;
            
            if (visited.has(currentHash)) continue;
            visited.add(currentHash);
            
            // Search for arcs from this element
            const template1 = new sc.ScTemplate();
            template1.triple(
                current,
                [sc.ScType.VarPermPosArc, '_arc'],
                [sc.ScType.Unknown, '_target']
            );
            
            // Search for arcs to this element
            const template2 = new sc.ScTemplate();
            template2.triple(
                [sc.ScType.Unknown, '_source'],
                '_arc',
                current
            );
            
            let results = [];
            try {
                results = await window.scClient.searchByTemplate(template1);
            } catch (e) {}
            
            try {
                results = results.concat(await window.scClient.searchByTemplate(template2));
            } catch (e) {}
            
            // Process results
            for (const result of results) {
                const arc = result.get('_arc');
                const source = result.get('_source');
                const target = result.get('_target');
                
                // Determine source and target
                const sourceAddr = source || target;
                const targetAddr = target || source;
                
                if (!sourceAddr || !targetAddr) continue;
                
                const srcHash = sourceAddr.value;
                const tgtHash = targetAddr.value;
                
                // Add to queue if not visited
                if (!visited.has(srcHash) && count < this.maxElements) {
                    queue.push(sourceAddr);
                }
                if (!visited.has(tgtHash) && count < this.maxElements) {
                    queue.push(targetAddr);
                }
                
                // Get element types
                const types = await window.scClient.getElementsTypes([sourceAddr, targetAddr, arc]);
                const sourceType = types[0];
                const targetType = types[1];
                const arcType = types[2];
                
                // Notify translator about the elements
                this.sandbox.eventStructUpdate({
                    sceneElement: arc,
                    sceneElementType: arcType,
                    sceneElementState: SCgObjectState.FromMemory,
                    sceneElementLevel: SCgObjectLevel.First,
                    sceneElementSource: sourceAddr,
                    sceneElementSourceType: sourceType,
                    sceneElementSourceLevel: SCgObjectLevel.First,
                    sceneElementTarget: targetAddr,
                    sceneElementTargetType: targetType,
                    sceneElementTargetLevel: SCgObjectLevel.First,
                });
                
                count++;
            }
        }
        
        console.log('[SCSearchIntegration] Processed', count, 'elements');
    },

    /**
     * Navigate to node
     */
    _navigateToNode: function(modelObject) {
        const render = this.editor.render;
        const scene = this.editor.scene;
        
        const x = modelObject.position.x;
        const y = modelObject.position.y;
        
        const containerWidth = render.d3_container[0][0].getBoundingClientRect().width;
        const containerHeight = render.d3_container[0][0].getBoundingClientRect().height;
        const currentScale = render.scale || 1;
        
        const newTranslateX = containerWidth / 2 - x * currentScale;
        const newTranslateY = containerHeight / 2 - y * currentScale;
        
        render._changeContainerTransform([newTranslateX, newTranslateY], currentScale);
        
        // Select the node
        scene.appendSelection(modelObject);
        render.update();
    }
};

window.SCSearchIntegration = SCSearchIntegration;
