/**
 * Panel System - Simple panel management (Fixed Version)
 */
class PanelSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.panels = [];
        this.resizables = [];
        this.isResizing = false;
        
        // Убедимся, что контейнер ведет себя как flex-контейнер
        if (getComputedStyle(container).display === 'inline') {
            container.style.display = 'flex';
        }

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
            
            // Начальная инициализация стилей
            if (savedSizes && savedSizes[index]) {
                // Если есть сохраненная ширина, применяем её, но не блокируем flex полностью
                panel.style.width = savedSizes[index] + 'px';
                panel.style.flex = '0 0 auto'; 
            } else {
                panel.style.flex = '1 1 0';
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
        
        // Небольшая задержка для гарантированной отрисовки перед первым расчетом
        requestAnimationFrame(() => this.adjustPanelSizes());
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
            
            // Проверка на существование элементов (на случай если массивы рассинхронизировались)
            if (!leftPanel || !rightPanel) return;

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

    /**
     * Ключевой метод: Заставляет все видимые панели делить пространство поровну
     */
    adjustPanelSizes() {
        const visiblePanels = this.getVisiblePanels();
        
        if (visiblePanels.length === 0) return;
        
        visiblePanels.forEach((panelObj) => {
            const el = panelObj.element;
            // Сбрасываем фиксированную ширину, чтобы flex работал
            el.style.width = ''; 
            el.style.minWidth = '';
            // Разрешаем расти и сжиматься
            el.style.flex = '1 1 0';
        });
    }

    onPanelCollapse(panelId, collapsedWidth) {
        // Сразу перераспределяем пространство между оставшимися
        this.adjustPanelSizes();
        this.updateResizeHandles();
    }

    onPanelExpand(panelId) {
        // При разворачивании тоже перераспределяем пространство
        this.adjustPanelSizes();
        this.updateResizeHandles();
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
                sizes.push(30); // Фиксированная ширина свернутой
            } else {
                // Сохраняем текущую вычисленную ширину
                sizes.push(panel.element.offsetWidth);
            }
            collapsed[panel.definition.id] = isCollapsed;
        });
        
        try {
            // Проверка на существование Config, чтобы не ломать код в изоляции
            if (typeof Config !== 'undefined' && Config.STORAGE_KEYS) {
                localStorage.setItem(Config.STORAGE_KEYS.PANEL_SIZES, JSON.stringify(sizes));
                localStorage.setItem(Config.STORAGE_KEYS.PANEL_COLLAPSED, JSON.stringify(collapsed));
            }
        } catch (e) {
            console.warn('[PanelSystem] Failed to save state:', e);
        }
    }

    loadSizes() {
        try {
            if (typeof Config !== 'undefined' && Config.STORAGE_KEYS) {
                const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_SIZES);
                return saved ? JSON.parse(saved) : null;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    loadCollapsed() {
        try {
            if (typeof Config !== 'undefined' && Config.STORAGE_KEYS) {
                const saved = localStorage.getItem(Config.STORAGE_KEYS.PANEL_COLLAPSED);
                return saved ? JSON.parse(saved) : null;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    loadState() {
        const collapsed = this.loadCollapsed();
        if (collapsed) {
            // Используем requestAnimationFrame чтобы DOM точно был готов
            requestAnimationFrame(() => {
                Object.keys(collapsed).forEach(panelId => {
                    if (collapsed[panelId]) {
                        this.collapsePanel(panelId);
                    }
                });
                // Финальная подгонка размеров после загрузки состояния
                this.adjustPanelSizes();
            });
        }
    }

    loadPanelState() {
        this.loadState();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanelSystem;
}