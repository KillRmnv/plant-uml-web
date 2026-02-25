/**
 * SC Search Handler - Handles search selection events
 * Loads nodes with semantic neighborhood from knowledge base
 * Uses approach from sc-web SCgViewerWindow._buildGraph
 */

const SCSearchHandler = {
    editor: null,

    init: function(editor) {
        this.editor = editor;
        
        window.addEventListener('scSearchSelect', async (event) => {
            console.log('[SCSearchHandler] Received search select:', event.detail);
            await this.loadNodeWithNeighbors(event.detail.addr, event.detail.identifier);
        });
        
        console.log('[SCSearchHandler] Initialized');
    },

    /**
     * Load node with neighbors - uses sc-web approach
     */
    loadNodeWithNeighbors: async function(addr, identifier) {
        if (!this.editor || !this.editor.scene || !window.scClient) {
            console.warn('[SCSearchHandler] Editor or scClient not available');
            return;
        }

        const scene = this.editor.scene;
        const render = this.editor.render;
        const addrNum = parseInt(addr);

        try {
            console.log('[SCSearchHandler] Loading neighborhood for addr:', addrNum);

            // Search for connected elements using template
            const scAddr = new sc.ScAddr(addrNum);
            
            // Search all connected elements (both as source and target)
            const allElements = await this._searchConnectedElements(scAddr);
            
            console.log('[SCSearchHandler] Found elements:', allElements.length);
            
            // Build graph using sc-web approach
            this._buildGraph(allElements, scene, render);

            console.log('[SCSearchHandler] Graph built successfully');
            
            // Navigate to main node
            const mainNode = scene.objects[addrNum];
            if (mainNode) {
                this._navigateToNode(mainNode);
            }

        } catch (error) {
            console.error('[SCSearchHandler] Error:', error);
        }
    },

    /**
     * Search all connected elements using template search
     */
    _searchConnectedElements: async function(mainAddr) {
        const elements = new Map();
        
        // Add main node
        elements.set(mainAddr.value, { id: mainAddr.value, type: null });
        
        // Template: search for any arc from main node
        const template1 = new sc.ScTemplate();
        template1.triple(
            mainAddr,
            [sc.ScType.Unknown, '_arc'],
            [sc.ScType.Unknown, '_target']
        );
        
        // Template: search for any arc to main node
        const template2 = new sc.ScTemplate();
        template2.triple(
            [sc.ScType.Unknown, '_source'],
            '_arc',
            mainAddr
        );
        
        const results = [];
        
        try {
            const res1 = await window.scClient.searchByTemplate(template1);
            results.push(...res1);
        } catch (e) {
            console.log('[SCSearchHandler] Template 1 error:', e);
        }
        
        try {
            const res2 = await window.scClient.searchByTemplate(template2);
            results.push(...res2);
        } catch (e) {
            console.log('[SCSearchHandler] Template 2 error:', e);
        }
        
        // Process results
        for (const result of results) {
            const arc = result.get('_arc');
            const source = result.get('_source');
            const target = result.get('_target');
            
            if (arc) elements.set(arc.value, { id: arc.value, type: 'arc' });
            if (source) elements.set(source.value, { id: source.value, type: 'node' });
            if (target) elements.set(target.value, { id: target.value, type: 'node' });
        }
        
        // Get types for all elements
        const addrs = Array.from(elements.keys()).map(v => new sc.ScAddr(v));
        const types = await window.scClient.getElementsTypes(addrs);
        
        // Combine with types
        const elementsWithTypes = [];
        let i = 0;
        for (const [addr, data] of elements) {
            elementsWithTypes.push({
                id: addr,
                el_type: types[i] ? types[i].value : 0
            });
            i++;
        }
        
        return elementsWithTypes;
    },

    /**
     * Build graph - copied and adapted from sc-web SCgViewerWindow._buildGraph
     */
    _buildGraph: function(data, scene, render) {
        // Ensure scene.objects exists
        if (!scene.objects) {
            scene.objects = {};
        }
        
        const elements = {};
        const connectors = [];
        
        for (let i = 0; i < data.length; i++) {
            const el = data[i];
            
            // Skip if already exists
            if (elements.hasOwnProperty(el.id)) continue;
            if (Object.prototype.hasOwnProperty.call(scene.objects, el.id)) {
                elements[el.id] = scene.objects[el.id];
                continue;
            }
            
            // Check if node or connector using bitwise (like sc-web)
            if (el.el_type & sc_type_node) {
                const model_node = SCg.Creator.generateNode(
                    el.el_type, 
                    new SCg.Vector3(10 * Math.random(), 10 * Math.random(), 0), 
                    ''
                );
                scene.appendNode(model_node);
                scene.objects[el.id] = model_node;
                model_node.setScAddr(el.id);
                model_node.setObjectState(SCgObjectState.FromMemory);
                elements[el.id] = model_node;
            } else if (el.el_type & sc_type_connector) {
                connectors.push(el);
            }
        }
        
        // Create connectors
        let founded = true;
        while (connectors.length > 0 && founded) {
            founded = false;
            for (let idx in connectors) {
                const obj = connectors[idx];
                const beginId = obj.begin;
                const endId = obj.end;
                
                // Check if both endpoints exist
                if (elements.hasOwnProperty(beginId) && elements.hasOwnProperty(endId)) {
                    const beginNode = elements[beginId];
                    const endNode = elements[endId];
                    founded = true;
                    connectors.splice(idx, 1);
                    
                    const model_connector = SCg.Creator.generateConnector(beginNode, endNode, obj.el_type);
                    scene.appendConnector(model_connector);
                    scene.objects[obj.id] = model_connector;
                    model_connector.setScAddr(obj.id);
                    model_connector.setObjectState(SCgObjectState.FromMemory);
                    elements[obj.id] = model_connector;
                }
            }
        }
        
        if (connectors.length > 0) {
            console.warn('[SCSearchHandler] Some connectors could not be shown:', connectors.length);
        }
        
        render.update();
        scene.layout();
        
        console.log('[SCSearchHandler] Built graph with', Object.keys(elements).length, 'elements');
    },

    /**
     * Navigate to node (pan and zoom)
     */
    _navigateToNode: function(modelObject) {
        if (!this.editor || !this.editor.render) return;
        
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
        scene.appendSelection(modelObject);
        render.update();
    }
};

window.SCSSearchHandler = SCSearchHandler;
