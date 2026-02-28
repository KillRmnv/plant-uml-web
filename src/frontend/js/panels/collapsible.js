/**
 * Collapsible - Simple panel collapse/expand logic
 */

class Collapsible {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            collapsedWidth: 30,
            fillSpace: options.fillSpace !== false,
            onToggle: options.onToggle || (() => {}),
            onCollapse: options.onCollapse || (() => {}),
            onExpand: options.onExpand || (() => {}),
        };
        
        this.isCollapsed = false;
        this.originalWidth = 0;
        this.isLocked = false;
        
        this.init();
    }

    init() {
        this.createCollapseToggle();
    }

    createCollapseToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'panel-collapse-toggle';
        toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        toggle.title = 'Expand';
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        this.element.appendChild(toggle);
        
        const actionBtn = this.element.querySelector('.panel-action-btn[data-action="collapse"]');
        
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
    }

    lock() {
        this.isLocked = true;
    }

    unlock() {
        this.isLocked = false;
    }

    toggle() {
        if (this.isLocked) return;
        
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    collapse() {
        if (this.isCollapsed || this.isLocked) return;
        
        this.originalWidth = this.element.offsetWidth;
        this.element.classList.add('collapsed');
        this.isCollapsed = true;
        
        this.options.onCollapse(this.originalWidth);
        this.options.onToggle(this.isCollapsed);
    }

    expand() {
        if (!this.isCollapsed || this.isLocked) return;
        
        this.element.classList.remove('collapsed');
        
        this.isCollapsed = false;
        
        this.options.onExpand();
        this.options.onToggle(this.isCollapsed);
    }

    getState() {
        return this.isCollapsed;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Collapsible;
}
