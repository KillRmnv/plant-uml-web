/**
 * Panel System - Simple panel management
 */

class PanelSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.panels = [];
        this.resizables = [];
        this.isResizing = false;
        
        this.init();
    }

    init() {
        this.createPanels();
        this.loadState();
        
        window.addEventListener('resize', () => this.adjustPanelSizes());
    }

    createPanels() {
        const panelDefinitions = [
            { id: 'editor', title: 'Editor', class: 'editor-panel' },
            { id: 'image', title: 'Preview', class: 'image-panel' },
            { id: 'assistant', title: 'AI Assistant', class: 'assistant-panel' },
        ];

        const savedSizes = this.loadSizes();
        
        panelDefinitions.forEach((def, index) => {
            const panel = this.createPanelElement(def);
            this.container.appendChild(panel);
            
            if (savedSizes && savedSizes[index]) {
                panel.style.width = savedSizes[index] + 'px';
            } else {
                panel.style.flex = '1';
            }
            
            const collapsible = new Collapsible(panel, {
                fillSpace: true,
                onCollapse: (originalWidth) => this.onPanelCollapse(def.id, originalWidth),
                onExpand: () => this.onPanelExpand(def.id),
                onToggle: () => {
                    this.saveState();
                    this.updateResizeHandles();
                }
            });
            
            this.panels.push({ element: panel, definition: def, collapsible });
        });
        
        this.setupResizeHandles();
        
        setTimeout(() => this.adjustPanelSizes(), 0);
    }

    createPanelElement(definition) {
        const panel = document.createElement('div');
        panel.className = 'panel ' + (definition.class || '');
        panel.id = `panel-${definition.id}`;
        
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
        
        for (let i = 0; i < panels.length - 1; i++) {
            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            this.container.insertBefore(handle, panels[i + 1]);
            
            const resizable = new Resizable(handle, panels[i], panels[i + 1], {
                minWidth: 150,
                onResizeEnd: () => {
                    this.isResizing = false;
                    this.unlockAllCollapsible();
                    this.saveState();
                }
            });
            
            resizable.handle.addEventListener('mousedown', () => {
                this.isResizing = true;
                this.lockAllCollapsible();
            });
            
            this.resizables.push(resizable);
        }
        
        this.updateResizeHandles();
    }

    lockAllCollapsible() {
        this.panels.forEach(p => p.collapsible.lock());
    }

    unlockAllCollapsible() {
        this.panels.forEach(p => p.collapsible.unlock());
    }

    updateResizeHandles() {
        const panelElements = this.panels.map(p => p.element);
        
        this.resizables.forEach((resizable, index) => {
            const leftPanel = panelElements[index];
            const rightPanel = panelElements[index + 1];
            
            const leftCollapsed = leftPanel.classList.contains('collapsed');
            const rightCollapsed = rightPanel.classList.contains('collapsed');
            
            if (leftCollapsed || rightCollapsed) {
                resizable.disable();
            } else {
                resizable.enable();
            }
        });
    }

    getVisiblePanels() {
        return this.panels.filter(p => !p.element.classList.contains('collapsed'));
    }

    getCollapsedPanels() {
        return this.panels.filter(p => p.element.classList.contains('collapsed'));
    }

    adjustPanelSizes() {
        const visiblePanels = this.getVisiblePanels();
        const collapsedCount = this.getCollapsedPanels().length;
        
        if (visiblePanels.length === 0) return;
        
        visiblePanels.forEach((panel) => {
            panel.element.style.flex = '1 1 0';
            panel.element.style.minWidth = '';
            panel.element.style.maxWidth = '';
            panel.element.style.width = '';
        });
        
        this.container.style.flex = '1';
    }

    onPanelCollapse(panelId, collapsedWidth) {
        this.getVisiblePanels().forEach(panel => {
            panel.element.style.flex = '';
            panel.element.style.width = '';
        });
        
        requestAnimationFrame(() => {
            this.adjustPanelSizes();
            this.updateResizeHandles();
        });
    }

    onPanelExpand(panelId) {
        requestAnimationFrame(() => {
            this.adjustPanelSizes();
            this.updateResizeHandles();
        });
    }

    getPanelContent(panelId) {
        const panel = this.panels.find(p => p.definition.id === panelId);
        if (panel) {
            return panel.element.querySelector('.panel-content');
        }
        return null;
    }

    collapsePanel(panelId) {
        const panel = this.panels.find(p => p.definition.id === panelId);
        if (panel && !panel.collapsible.getState()) {
            panel.collapsible.collapse();
        }
    }

    expandPanel(panelId) {
        const panel = this.panels.find(p => p.definition.id === panelId);
        if (panel && panel.collapsible.getState()) {
            panel.collapsible.expand();
        }
    }

    togglePanel(panelId) {
        const panel = this.panels.find(p => p.definition.id === panelId);
        if (panel) {
            panel.collapsible.toggle();
        }
    }

    isCollapsed(panelId) {
        const panel = this.panels.find(p => p.definition.id === panelId);
        if (panel) {
            return panel.collapsible.getState();
        }
        return false;
    }

    saveState() {
        const sizes = [];
        const collapsed = {};
        
        this.panels.forEach(panel => {
            const isCollapsed = panel.element.classList.contains('collapsed');
            if (isCollapsed) {
                sizes.push(30);
            } else {
                sizes.push(panel.element.offsetWidth);
            }
            collapsed[panel.definition.id] = isCollapsed;
        });
        
        try {
            localStorage.setItem(Config.STORAGE_KEYS.PANEL_SIZES, JSON.stringify(sizes));
            localStorage.setItem(Config.STORAGE_KEYS.PANEL_COLLAPSED, JSON.stringify(collapsed));
        } catch (e) {
            console.warn('[PanelSystem] Failed to save state:', e);
        }
    }

    loadSizes() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_SIZES);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    loadCollapsed() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_COLLAPSED);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    loadState() {
        const collapsed = this.loadCollapsed();
        if (collapsed) {
            setTimeout(() => {
                Object.keys(collapsed).forEach(panelId => {
                    if (collapsed[panelId]) {
                        this.collapsePanel(panelId);
                    }
                });
                this.adjustPanelSizes();
            }, 100);
        }
    }

    loadPanelState() {
        this.loadState();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanelSystem;
}
