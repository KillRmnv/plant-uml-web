/**
 * SC Search Integration - Full integration with sc-web approach
 * Uses SCgStructTranslator and implements depth-based search for nodes
 */

const SCSearchIntegration = {
    editor: null,
    sandbox: null,
    searcher: null,
    translator: null,
    currentAddr: null,
    maxDepth: 4,  // Maximum depth for neighborhood search

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

        const addrNum = parseInt(addr);
        this.currentAddr = addrNum;
        
        console.log('[SCSearchIntegration] All checks passed, starting search...');
        
        // Clear existing content
        this._clearScene();
        
        // Create sandbox for this search
        this._createSandbox(addrNum);
        
        // Initialize translator
        this._initTranslator();
        
        // Run search with depth
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
     * Create sandbox object - mimics ComponentSandbox from sc-web
     */
    _createSandbox: function(addr) {
        const self = this;
        
        this.sandbox = {
            addr: new sc.ScAddr(addr),
            is_struct: true,  // Treat as struct for translator compatibility
            format_addr: 'format_scg_json',
            
            // Event for struct updates - called by search functions
            eventStructUpdate: function(data) {
                console.log('[SCSearchIntegration] eventStructUpdate called');
                if (self.translator && self.translator.updateFromSc) {
                    self.translator.updateFromSc(data).catch(err => {
                        console.error('[SCSearchIntegration] Error in updateFromSc:', err);
                    });
                }
            },
            
            // Layout functions
            layout: function(scene) {
                scene.layout();
            },
            
            postLayout: function(scene) {
                self.editor.render.update();
            },
            
            // Get identifier for an sc-element - using scHelper approach
            getIdentifier: function(addr, callback) {
                const addrNum = typeof addr === 'number' ? addr : (addr.value || addr._value);
                const addrObj = new sc.ScAddr(addrNum);
                
                console.log('[SCSearchIntegration] getIdentifier for:', addrNum);
                
                // Use scHelper to get identifier via nrel_main_idtf
                if (window.scHelper && window.scKeynodes) {
                    window.scHelper.searchNodeByIdentifier(addrObj, window.scKeynodes["nrel_main_idtf"])
                        .then(idtf => {
                            console.log('[SCSearchIntegration] Got identifier via nrel_main_idtf:', idtf);
                            callback(idtf || '');
                        })
                        .catch(err => {
                            console.warn('[SCSearchIntegration] Error getting identifier:', err);
                            callback('');
                        });
                } else {
                    console.warn('[SCSearchIntegration] scHelper or scKeynodes not available');
                    callback('');
                }
            },
            
            // Can edit check
            canEdit: function() {
                return true;
            },
            
            can_edit: true,
            
            // For keynodes resolution
            keynodes: window.scKeynodes || {},
            
            // Container info
            container: 'scg-viewer',
            
            // Create viewers for sc-links
            createViewersForScLinks: function(links) {
                console.log('[SCSearchIntegration] createViewersForScLinks:', links);
            },
            
            // Create viewers for sc-structs
            createViewersForScStructs: function(structs) {
                console.log('[SCSearchIntegration] createViewersForScStructs:', structs);
            },
            
            // Resolve elements addr
            resolveElementsAddr: function(parentSelector) {
                console.log('[SCSearchIntegration] resolveElementsAddr:', parentSelector);
            },
            
            // Get current language
            getCurrentLanguage: function() {
                if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.Translation) {
                    return SCWeb.core.Translation.getCurrentLanguage();
                }
                return 0;
            },
            
            // Get languages
            getLanguages: function() {
                if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.Translation) {
                    return SCWeb.core.Translation.getLanguages();
                }
                return [];
            },
            
            // Do default command
            doDefaultCommand: function(args) {
                console.log('[SCSearchIntegration] doDefaultCommand:', args);
            },
            
            // Once updable objects
            onceUpdatableObjects: {},
            
            // For update content
            updateContent: function() {
                console.log('[SCSearchIntegration] updateContent called');
            },
            
            // Event for data append
            eventDataAppend: function(data) {
                console.log('[SCSearchIntegration] eventDataAppend:', data);
            },
            
            // Get objects to translate
            getObjectsToTranslate: function() {
                const scene = self.editor.scene;
                if (scene && scene.getScAddrs) {
                    return scene.getScAddrs();
                }
                return [];
            },
            
            // Apply translation
            updateTranslation: function(translationMap) {
                console.log('[SCSearchIntegration] updateTranslation:', translationMap);
                if (self.editor && self.editor.scene) {
                    for (const [addr, text] of Object.entries(translationMap)) {
                        const obj = self.editor.scene.getObjectByScAddr(addr);
                        if (obj) {
                            obj.setText(text);
                        }
                    }
                    if (self.editor.render) {
                        self.editor.render.updateTexts();
                    }
                }
            },
            
            // Child windows
            childs: {},
            
            // Add children
            _appendChilds: function(windows) {
                this.childs = Object.assign(this.childs, windows);
            },
            
            // Remove child
            removeChild: function() {
                this.childs = {};
            },
            
            // Update result
            updateResult: function() {
                console.log('[SCSearchIntegration] updateResult called');
            }
        };
        
        console.log('[SCSearchIntegration] Sandbox created for addr:', addr);
    },

    /**
     * Initialize the translator using SCgStructTranslator from sc-web
     */
    _initTranslator: function() {
        const self = this;
        
        if (typeof window.SCgStructTranslator === 'undefined') {
            console.error('[SCSearchIntegration] SCgStructTranslator is not defined!');
            return;
        }
        
        this.translator = new window.SCgStructTranslator(this.editor, this.sandbox);
        
        console.log('[SCSearchIntegration] Translator initialized');
    },

    /**
     * Run the search - determines element type and uses appropriate search
     */
    _runSearch: async function(addrNum) {
        const self = this;
        const scAddr = new sc.ScAddr(addrNum);
        
        try {
            console.log('[SCSearchIntegration] Starting search for addr:', addrNum);
            
            // Get element type
            const types = await window.scClient.getElementsTypes([scAddr]);
            const mainType = types[0];
            console.log('[SCSearchIntegration] Element type:', mainType.value, 'is_struct:', mainType.value & sc_type_node_structure);
            
            // Check if this is a structure
            const isStructure = (mainType.value & sc_type_node_structure) === sc_type_node_structure;
            
            if (isStructure) {
                // It's a structure - use DistanceBasedSCgSearcher
                console.log('[SCSearchIntegration] Element is a structure, using DistanceBasedSCgSearcher');
                
                if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.DistanceBasedSCgSearcher) {
                    this.searcher = new SCWeb.core.DistanceBasedSCgSearcher(this.sandbox);
                    const status = await this.searcher.searchContent([scAddr]);
                    console.log('[SCSearchIntegration] Search status:', status);
                    await this.searcher.initAppendRemoveElementsUpdate();
                }
            } else {
                // It's a node/link - use depth-based search
                console.log('[SCSearchIntegration] Element is a node/link, using depth-based search with max depth:', this.maxDepth);
                await this._depthBasedSearch(scAddr, this.maxDepth);
                
                // Initialize real-time updates for the main element
                await this._initRealTimeUpdates(scAddr);
            }
            
            // Navigate to the main node
            const mainNode = this.editor.scene.getObjectByScAddr(addrNum);
            if (mainNode) {
                this._navigateToNode(mainNode);
            }
            
            console.log('[SCSearchIntegration] Search complete');
            
        } catch (error) {
            console.error('[SCSearchIntegration] Search error:', error);
        }
    },

    /**
     * Depth-based search (BFS) for neighborhood exploration
     */
    _depthBasedSearch: async function(mainAddr, maxDepth) {
        console.log('[SCSearchIntegration] Starting depth-based search from:', mainAddr.value, 'maxDepth:', maxDepth);
        
        const visited = new Map(); // addr -> {type, level}
        const queue = [{addr: mainAddr, level: 0, parentArc: null}];
        
        // Add main node first
        const mainType = (await window.scClient.getElementsTypes([mainAddr]))[0];
        console.log('[SCSearchIntegration] Main node type:', mainType?.value);
        visited.set(mainAddr.value, {type: mainType, level: 0});
        
        // Send main node to translator
        this.sandbox.eventStructUpdate({
            sceneElement: mainAddr,
            sceneElementType: mainType,
            sceneElementState: SCgObjectState.FromMemory,
            sceneElementLevel: SCgObjectLevel.First
        });
        console.log('[SCSearchIntegration] Added main node to scene');
        
        // Process queue with BFS
        let iteration = 0;
        const maxIterations = 1000; // Safety limit
        
        while (queue.length > 0 && iteration < maxIterations) {
            iteration++;
            const {addr: currentAddr, level: currentLevel} = queue.shift();
            
            console.log('[SCSearchIntegration] Processing:', currentAddr.value, 'at level', currentLevel);
            
            // Skip if already at max depth
            if (currentLevel >= maxDepth) continue;
            
            // Search for outgoing connections
            const outgoingTemplate = new sc.ScTemplate();
            outgoingTemplate.triple(
                currentAddr,
                [sc.ScType.Arc, '_arc'],
                [sc.ScType.Unknown, '_target']
            );
            
            // Search for incoming connections
            const incomingTemplate = new sc.ScTemplate();
            incomingTemplate.triple(
                [sc.ScType.Unknown, '_source'],
                [sc.ScType.Arc, '_arc'],
                currentAddr
            );
            
            let results = [];
            
            try {
                const outgoing = await window.scClient.searchByTemplate(outgoingTemplate);
                console.log('[SCSearchIntegration] Outgoing template results:', outgoing.length);
                for (const r of outgoing) {
                    console.log('[SCSearchIntegration]   Outgoing - arc:', r.get('_arc')?.value, 'source:', r.get('_source')?.value, 'target:', r.get('_target')?.value);
                }
                results.push(...outgoing);
            } catch (e) {
                console.warn('[SCSearchIntegration] Outgoing template error:', e);
            }
            
            try {
                const incoming = await window.scClient.searchByTemplate(incomingTemplate);
                console.log('[SCSearchIntegration] Incoming template results:', incoming.length);
                for (const r of incoming) {
                    console.log('[SCSearchIntegration]   Incoming - arc:', r.get('_arc')?.value, 'source:', r.get('_source')?.value, 'target:', r.get('_target')?.value);
                }
                results.push(...incoming);
            } catch (e) {
                console.warn('[SCSearchIntegration] Incoming template error:', e);
            }
            
            console.log('[SCSearchIntegration] Total connections found at level', currentLevel, ':', results.length);
            
            // Process results
            for (const result of results) {
                const arc = result.get('_arc');
                const source = result.get('_source');
                const target = result.get('_target');
                
                if (!arc) continue;
                
                console.log('[SCSearchIntegration] Processing connection - arc:', arc.value, 'source:', source?.value, 'target:', target?.value);
                
                // Determine connected element (not the current one)
                let connectedAddr = null;
                if (source && source.value === currentAddr.value) {
                    connectedAddr = target;
                } else if (target && target.value === currentAddr.value) {
                    connectedAddr = source;
                }
                
                if (!connectedAddr || !connectedAddr.isValid()) continue;
                
                const connHash = connectedAddr.value;
                
                // Skip if already visited
                if (visited.has(connHash)) continue;
                
                // Get types for arc and connected element
                const arcType = (await window.scClient.getElementsTypes([arc]))[0];
                const connectedType = (await window.scClient.getElementsTypes([connectedAddr]))[0];
                const currentType = visited.get(currentAddr.value).type;
                
                console.log('[SCSearchIntegration]   Arc type:', arcType?.value, 'Connected type:', connectedType?.value);
                
                const nextLevel = currentLevel + 1;
                
                // Mark as visited
                visited.set(connHash, {type: connectedType, level: nextLevel});
                
                // Add to queue for further exploration
                queue.push({addr: connectedAddr, level: nextLevel});
                
                // Send update to translator - this adds the element to the scene
                this.sandbox.eventStructUpdate({
                    sceneElement: arc,
                    sceneElementType: arcType,
                    sceneElementState: SCgObjectState.FromMemory,
                    sceneElementLevel: this._scgLevelFromDepth(nextLevel),
                    sceneElementSource: source || currentAddr,
                    sceneElementSourceType: source ? connectedType : currentType,
                    sceneElementSourceLevel: this._scgLevelFromDepth(source ? nextLevel : currentLevel),
                    sceneElementTarget: target || currentAddr,
                    sceneElementTargetType: target ? connectedType : currentType,
                    sceneElementTargetLevel: this._scgLevelFromDepth(target ? nextLevel : currentLevel)
                });
                
                // Also send update for the connected node itself
                this.sandbox.eventStructUpdate({
                    sceneElement: connectedAddr,
                    sceneElementType: connectedType,
                    sceneElementState: SCgObjectState.FromMemory,
                    sceneElementLevel: this._scgLevelFromDepth(nextLevel)
                });
                
                console.log('[SCSearchIntegration]   Added to scene - element:', connectedAddr.value, 'type:', connectedType?.value);
            }
        }
        
        console.log('[SCSearchIntegration] Depth-based search complete. Visited:', visited.size);
    },

    /**
     * Convert depth to SCgObjectLevel
     */
    _scgLevelFromDepth: function(depth) {
        const levels = [
            SCgObjectLevel.First,
            SCgObjectLevel.Second,
            SCgObjectLevel.Third,
            SCgObjectLevel.Fourth,
            SCgObjectLevel.Fifth,
            SCgObjectLevel.Sixth,
            SCgObjectLevel.Seventh
        ];
        return levels[Math.min(depth, levels.length - 1)];
    },

    /**
     * Initialize real-time updates for a node
     */
    _initRealTimeUpdates: async function(mainAddr) {
        try {
            // Subscribe to outgoing arc generation
            const generateArcParams = new sc.ScEventSubscriptionParams(
                mainAddr,
                sc.ScEventType.AfterGenerateOutgoingArc,
                async (elAddr, connector, otherAddr) => {
                    if (!this.sandbox.eventStructUpdate) return;
                    
                    const type = (await window.scClient.getElementsTypes([connector]))[0];
                    if (!type.equal(sc.ScType.ConstPermPosArc)) return;
                    
                    const otherType = (await window.scClient.getElementsTypes([otherAddr]))[0];
                    
                    this.sandbox.eventStructUpdate({
                        sceneElement: connector,
                        sceneElementType: type,
                        sceneElementState: SCgObjectState.MergedWithMemory,
                        sceneElementLevel: SCgObjectLevel.First,
                        sceneElementSource: mainAddr,
                        sceneElementSourceType: (await window.scClient.getElementsTypes([mainAddr]))[0],
                        sceneElementSourceLevel: SCgObjectLevel.First,
                        sceneElementTarget: otherAddr,
                        sceneElementTargetType: otherType,
                        sceneElementTargetLevel: SCgObjectLevel.First
                    });
                    
                    this.sandbox.eventStructUpdate({
                        sceneElement: otherAddr,
                        sceneElementType: otherType,
                        sceneElementState: SCgObjectState.MergedWithMemory,
                        sceneElementLevel: SCgObjectLevel.First
                    });
                }
            );
            
            // Subscribe to arc deletion
            const eraseArcParams = new sc.ScEventSubscriptionParams(
                mainAddr,
                sc.ScEventType.BeforeEraseOutgoingArc,
                async (elAddr, connector, otherAddr) => {
                    if (!this.sandbox.eventStructUpdate) return;
                    if (await window.scHelper.checkConnector(elAddr.value, sc.ScType.ConstPermPosArc, otherAddr.value)) return;
                    
                    this.sandbox.eventStructUpdate({
                        sceneElement: otherAddr,
                        sceneElementState: SCgObjectState.RemovedFromMemory
                    });
                }
            );
            
            const [generateEvent, eraseEvent] = await window.scClient.createElementaryEventSubscriptions([
                generateArcParams,
                eraseArcParams
            ]);
            
            console.log('[SCSearchIntegration] Real-time updates initialized for:', mainAddr.value);
            
        } catch (error) {
            console.error('[SCSearchIntegration] Error initializing real-time updates:', error);
        }
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
    },

    /**
     * Update translations (identifiers) for all elements in the scene
     */
    _updateTranslations: function() {
        if (!this.editor || !this.editor.scene) return;
        
        const scene = this.editor.scene;
        const addrs = scene.getScAddrs ? scene.getScAddrs() : [];
        
        if (addrs.length === 0) return;
        
        console.log('[SCSearchIntegration] Updating translations for', addrs.length, 'elements');
        
        if (typeof SCWeb !== 'undefined' && SCWeb.core && SCWeb.core.Translation) {
            SCWeb.core.Translation.translate(addrs).then((namesMap) => {
                for (const [addr, text] of Object.entries(namesMap)) {
                    const obj = scene.getObjectByScAddr(addr);
                    if (obj) {
                        obj.setText(text);
                    }
                }
                if (this.editor.render) {
                    this.editor.render.updateTexts();
                }
                console.log('[SCSearchIntegration] Translations updated');
            }).catch(err => {
                console.warn('[SCSearchIntegration] Translation error:', err);
            });
        }
    },

    /**
     * Clean up
     */
    destroy: function() {
        if (this.searcher && this.searcher.destroyAppendRemoveElementsUpdate) {
            this.searcher.destroyAppendRemoveElementsUpdate();
        }
        this.translator = null;
        this.searcher = null;
        this.sandbox = null;
        console.log('[SCSearchIntegration] Destroyed');
    }
};

window.SCSearchIntegration = SCSearchIntegration;
