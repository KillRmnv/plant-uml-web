/**
 * Collapsible - Panel collapse/expand logic
 * Handles panel collapse and expand functionality
 */

class Collapsible {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            direction: options.direction || 'left',
            collapsedWidth: options.collapsedWidth || 0,
            animate: options.animate !== false,
            duration: options.duration || 200,
            onCollapse: options.onCollapse || (() => {}),
            onExpand: options.onExpand || (() => {}),
        };
        
        this.isCollapsed = false;
        this.collapseBtn = null;
        this.originalWidth = 0;
        
        this.init();
    }

    init() {
        this.createCollapseButton();
        this.bindEvents();
    }

    createCollapseButton() {
        this.collapseBtn = document.createElement('button');
        this.collapseBtn.className = `panel-collapse-btn ${this.options.direction}`;
        this.collapseBtn.innerHTML = this.options.direction === 'left' 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        
        this.collapseBtn.style.display = 'none';
        this.element.appendChild(this.collapseBtn);
    }

    bindEvents() {
        this.collapseBtn.addEventListener('click', () => this.toggle());
    }

    toggle() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    collapse() {
        if (this.isCollapsed) return;
        
        this.originalWidth = this.element.offsetWidth;
        
        if (this.options.animate) {
            this.element.style.transition = `width ${this.options.duration}ms ease`;
            this.element.style.width = `${this.options.collapsedWidth}px`;
            
            setTimeout(() => {
                this.element.classList.add('collapsed');
                this.element.style.transition = '';
                this.showExpandButton();
                this.options.onCollapse();
            }, this.options.duration);
        } else {
            this.element.classList.add('collapsed');
            this.element.style.width = `${this.options.collapsedWidth}px`;
            this.showExpandButton();
            this.options.onCollapse();
        }
        
        this.isCollapsed = true;
    }

    expand() {
        if (!this.isCollapsed) return;
        
        this.hideExpandButton();
        this.element.classList.remove('collapsed');
        
        if (this.options.animate) {
            this.element.style.transition = `width ${this.options.duration}ms ease`;
            this.element.style.width = `${this.originalWidth}px`;
            
            setTimeout(() => {
                this.element.style.transition = '';
                this.options.onExpand();
            }, this.options.duration);
        } else {
            this.element.style.width = `${this.originalWidth}px`;
            this.options.onExpand();
        }
        
        this.isCollapsed = false;
    }

    showExpandButton() {
        this.collapseBtn.style.display = 'flex';
    }

    hideExpandButton() {
        this.collapseBtn.style.display = 'none';
    }

    setCollapsed(collapsed) {
        if (collapsed && !this.isCollapsed) {
            this.collapse();
        } else if (!collapsed && this.isCollapsed) {
            this.expand();
        }
    }

    getState() {
        return this.isCollapsed;
    }

    destroy() {
        if (this.collapseBtn && this.collapseBtn.parentNode) {
            this.collapseBtn.parentNode.removeChild(this.collapseBtn);
        }
        this.element.classList.remove('collapsed');
        this.element.style.width = '';
        this.element.style.transition = '';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Collapsible;
}
