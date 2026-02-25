/**
 * SCg Search - Search functionality for SCg Editor
 * Integrates with sc-server to search knowledge base
 */

const SCgSearch = {
    editor: null,
    searchInput: null,
    
    /**
     * Initialize search functionality
     * @param {Object} editor - SCg editor instance
     */
    init: function(editor) {
        this.editor = editor;
        
        // Try to find search input - first in panel, then in toolbar
        this.searchInput = document.getElementById('scg-search-input-panel') || 
                          document.getElementById('scg-search-input');
        
        if (!this.searchInput) {
            console.warn('[SCgSearch] Search input not found');
            // Retry after a delay
            setTimeout(() => {
                this.searchInput = document.getElementById('scg-search-input-panel') || 
                                  document.getElementById('scg-search-input');
                if (this.searchInput && !this.searchInput.dataset.initialized) {
                    this._initTypeahead();
                    console.log('[SCgSearch] Initialized (delayed)');
                }
            }, 1000);
            return;
        }
        
        if (this.searchInput.dataset.initialized === 'true') {
            console.log('[SCgSearch] Already initialized');
            return;
        }
        
        this.searchInput.dataset.initialized = 'true';
        this._initTypeahead();
        console.log('[SCgSearch] Initialized');
    },
    
    /**
     * Initialize typeahead for search input
     */
    _initTypeahead: function() {
        const self = this;
        
        if (typeof $.fn.typeahead === 'undefined') {
            console.warn('[SCgSearch] Typeahead not loaded');
            return;
        }
        
        $(this.searchInput).typeahead({
            minLength: 1,
            highlight: true,
        }, {
            name: 'scs-search',
            source: self._debounce(function(str, callback) {
                self._searchNodes(str, callback);
            }, 500),
            templates: {
                suggestion: function(string) {
                    return '<p>' + string + '</p>';
                }
            }
        })
        .bind('typeahead:selected', function(event, string, dataset) {
            self._onSelectResult(string);
        })
        .keypress(function(event) {
            if (event.which === 13) {
                const value = $(this).val();
                if (value) {
                    self._onSelectResult(value);
                }
            }
        });
    },
    
    /**
     * Debounce function for search
     */
    _debounce: function(fn, ms) {
        let timeout;
        return function() {
            const args = arguments;
            const self = this;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                fn.apply(self, args);
            }, ms);
        };
    },
    
    /**
     * Search nodes in knowledge base
     */
    _searchNodes: async function(str, callback) {
        console.log('[SCgSearch] Searching for:', str);
        
        if (!window.scClient) {
            console.warn('[SCgSearch] scClient not available');
            callback([]);
            return;
        }
        
        try {
            const results = await window.scClient.searchLinkContentsByContentSubstrings([str]);
            
            const maxContentSize = 200;
            let keys = [];
            
            if (results && results[0]) {
                keys = results[0].filter(function(string) {
                    return string && string.length < maxContentSize;
                });
            }
            
            console.log('[SCgSearch] Found:', keys.length, 'results');
            callback(keys);
        } catch (error) {
            console.error('[SCgSearch] Search error:', error);
            callback([]);
        }
    },
    
    /**
     * Handle result selection
     */
    _onSelectResult: async function(identifier) {
        console.log('[SCgSearch] Selected:', identifier);
        
        if (!this.editor) {
            console.warn('[SCgSearch] Editor not available');
            return;
        }
        
        try {
            // Step 1: Resolve identifier to sc-addr
            const resolved = await this._resolveIdentifier(identifier);
            
            if (!resolved) {
                console.warn('[SCgSearch] Could not resolve identifier:', identifier);
                return;
            }
            
            console.log('[SCgSearch] Resolved to addr:', resolved);
            
            // Step 2: Find node in current scene
            const modelObject = this._findNodeInScene(identifier, resolved);
            
            if (modelObject) {
                // Step 3: Navigate to node and select
                this._navigateToNode(modelObject);
            } else {
                console.log('[SCgSearch] Node not in current scene, would load from KB');
                // TODO: Load node from knowledge base if not in scene
            }
            
        } catch (error) {
            console.error('[SCgSearch] Error selecting result:', error);
        }
        
        // Clear typeahead
        $('.typeahead').val('');
        $('.tt-dropdown-menu').hide();
    },
    
    /**
     * Resolve identifier to sc-addr
     */
    _resolveIdentifier: async function(identifier) {
        if (!window.scClient) {
            return null;
        }
        
        try {
            const keynodesData = [{ id: identifier, type: new sc.ScType() }];
            const result = await window.scClient.resolveKeynodes(keynodesData);
            
            if (result && result[identifier]) {
                return result[identifier].value;
            }
            
            return null;
        } catch (error) {
            console.error('[SCgSearch] Error resolving identifier:', error);
            return null;
        }
    },
    
    /**
     * Find node in current scene by identifier or sc-addr
     */
    _findNodeInScene: function(identifier, addr) {
        if (!this.editor || !this.editor.scene) {
            return null;
        }
        
        const objects = this.editor.scene.objects;
        
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            
            // Check by identifier
            if (obj.idtf === identifier) {
                return obj;
            }
            
            // Check by sc-addr if available
            if (obj.sc_addr && obj.sc_addr === addr) {
                return obj;
            }
            
            // Check by system identifier
            if (obj.sys_identif === identifier) {
                return obj;
            }
        }
        
        return null;
    },
    
    /**
     * Navigate to node in scene (pan and zoom)
     */
    _navigateToNode: function(modelObject) {
        if (!this.editor || !this.editor.render) {
            return;
        }
        
        const render = this.editor.render;
        
        // Get node position
        const x = modelObject.position.x;
        const y = modelObject.position.y;
        
        console.log('[SCgSearch] Navigating to:', x, y);
        
        // Calculate new transform to center on node
        const containerWidth = render.d3_container[0][0].getBoundingClientRect().width;
        const containerHeight = render.d3_container[0][0].getBoundingClientRect().height;
        
        // Get current scale
        const currentScale = render.scale || 1;
        
        // Calculate translate to center the node
        const newTranslateX = containerWidth / 2 - x * currentScale;
        const newTranslateY = containerHeight / 2 - y * currentScale;
        
        // Apply transform
        render._changeContainerTransform([newTranslateX, newTranslateY], currentScale);
        
        // Select the node
        this.editor.scene.selectObjects([modelObject]);
        
        // Update render
        render.update();
        
        console.log('[SCgSearch] Navigated to node');
    },
    
    /**
     * Clear search input
     */
    clear: function() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        $('.typeahead').val('');
        $('.tt-dropdown-menu').hide();
    },
    
    /**
     * Destroy search functionality
     */
    destroy: function() {
        if (this.searchInput && $(this.searchInput).data('typeahead')) {
            $(this.searchInput).typeahead('destroy');
        }
        this.editor = null;
        this.searchInput = null;
    }
};

// Make global
window.SCgSearch = SCgSearch;
