/**
 * Panel System - Manages all panels
 * Handles resize, collapse, and state management for all panels
 */

class PanelSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        
        this.panels = [];
        this.resizables = [];
        this.collapsibles = [];
        
        this.init();
    }

    init() {
        this.createPanels();
        this.setupResizeHandles();
    }

    createPanels() {
        const panelDefinitions = [
            { id: 'editor', title: 'Editor', icon: 'edit' },
            { id: 'image', title: 'Preview', icon: 'image' },
            { id: 'assistant', title: 'AI Assistant', icon: 'bot' },
        ];

        const defaultWidths = this.loadPanelSizes() || Config.PANELS.DEFAULT_WIDTHS;
        
        panelDefinitions.forEach((def, index) => {
            const panel = this.createPanelElement(def, defaultWidths[index]);
            this.container.appendChild(panel);
            
            const collapsible = new Collapsible(panel, {
                direction: index === 0 ? 'left' : 'right',
                onCollapse: () => this.savePanelState(),
                onExpand: () => this.savePanelState(),
            });
            
            this.panels.push({ element: panel, definition: def, collapsible });
        });
    }

    createPanelElement(definition, width) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = `panel-${definition.id}`;
        panel.style.width = `${width}%`;
        
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">${definition.title}</span>
                <div class="panel-actions">
                    <button class="panel-action-btn" data-action="collapse" title="Collapse">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="panel-content" id="content-${definition.id}"></div>
        `;
        
        return panel;
    }

    setupResizeHandles() {
        const panels = this.container.querySelectorAll('.panel');
        
        panels.forEach((panel, index) => {
            if (index < panels.length - 1) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                this.container.insertBefore(handle, panels[index + 1]);
                
                const containerWidth = this.container.offsetWidth;
                const maxWidth = containerWidth - (panels.length - index - 1) * Config.PANELS.MIN_WIDTH;
                
                const resizable = new Resizable(panel, {
                    minWidth: Config.PANELS.MIN_WIDTH,
                    maxWidth: maxWidth,
                    onResizeEnd: () => this.savePanelSizes(),
                });
                
                this.resizables.push(resizable);
            }
        });
    }

    getPanel(panelId) {
        return this.panels.find(p => p.definition.id === panelId);
    }

    getPanelContent(panelId) {
        const panel = this.getPanel(panelId);
        if (panel) {
            return panel.element.querySelector('.panel-content');
        }
        return null;
    }

    collapsePanel(panelId) {
        const panel = this.getPanel(panelId);
        if (panel && panel.collapsible) {
            panel.collapsible.collapse();
        }
    }

    expandPanel(panelId) {
        const panel = this.getPanel(panelId);
        if (panel && panel.collapsible) {
            panel.collapsible.expand();
        }
    }

    togglePanel(panelId) {
        const panel = this.getPanel(panelId);
        if (panel && panel.collapsible) {
            panel.collapsible.toggle();
        }
    }

    isCollapsed(panelId) {
        const panel = this.getPanel(panelId);
        if (panel && panel.collapsible) {
            return panel.collapsible.getState();
        }
        return false;
    }

    savePanelSizes() {
        const sizes = [];
        this.panels.forEach(panel => {
            const width = panel.element.offsetWidth;
            const percent = (width / this.container.offsetWidth) * 100;
            sizes.push(percent);
        });
        
        try {
            localStorage.setItem(Config.STORAGE_KEYS.PANEL_SIZES, JSON.stringify(sizes));
        } catch (e) {
            console.warn('[PanelSystem] Failed to save panel sizes:', e);
        }
    }

    loadPanelSizes() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_SIZES);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('[PanelSystem] Failed to load panel sizes:', e);
            return null;
        }
    }

    savePanelState() {
        const state = {};
        this.panels.forEach(panel => {
            state[panel.definition.id] = {
                collapsed: panel.collapsible.getState(),
            };
        });
        
        try {
            localStorage.setItem(Config.STORAGE_KEYS.PANEL_COLLAPSED, JSON.stringify(state));
        } catch (e) {
            console.warn('[PanelSystem] Failed to save panel state:', e);
        }
    }

    loadPanelState() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_COLLAPSED);
            if (saved) {
                const state = JSON.parse(saved);
                Object.keys(state).forEach(panelId => {
                    if (state[panelId].collapsed) {
                        this.collapsePanel(panelId);
                    }
                });
            }
        } catch (e) {
            console.warn('[PanelSystem] Failed to load panel state:', e);
        }
    }

    destroy() {
        this.resizables.forEach(r => r.destroy());
        this.collapsibles.forEach(c => c.destroy());
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanelSystem;
}
