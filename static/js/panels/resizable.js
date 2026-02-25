/**
 * Resizable - Panel resize logic
 * Handles drag-to-resize functionality for panels
 */

class Resizable {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            minWidth: options.minWidth || Config.PANELS.MIN_WIDTH,
            maxWidth: options.maxWidth || options.maxWidth || null,
            onResize: options.onResize || (() => {}),
            onResizeStart: options.onResizeStart || (() => {}),
            onResizeEnd: options.onResizeEnd || (() => {}),
        };
        
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        
        this.handle = null;
        this.init();
    }

    init() {
        this.createHandle();
        this.bindEvents();
    }

    createHandle() {
        this.handle = document.createElement('div');
        this.handle.className = 'resize-handle';
        this.element.appendChild(this.handle);
    }

    bindEvents() {
        this.handle.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        this.handle.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    onMouseDown(e) {
        if (e.button !== 0) return;
        
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.element.offsetWidth;
        
        this.handle.classList.add('active');
        this.options.onResizeStart();
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    onMouseMove(e) {
        if (!this.isResizing) return;
        
        const deltaX = e.clientX - this.startX;
        let newWidth = this.startWidth + deltaX;
        
        newWidth = Math.max(this.options.minWidth, newWidth);
        if (this.options.maxWidth) {
            newWidth = Math.min(this.options.maxWidth, newWidth);
        }
        
        this.element.style.width = `${newWidth}px`;
        this.options.onResize(newWidth);
    }

    onMouseUp() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.handle.classList.remove('active');
        
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        this.options.onResizeEnd();
    }

    onTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        e.preventDefault();
        this.isResizing = true;
        this.startX = e.touches[0].clientX;
        this.startWidth = this.element.offsetWidth;
        
        this.handle.classList.add('active');
        this.options.onResizeStart();
    }

    onTouchMove(e) {
        if (!this.isResizing || e.touches.length !== 1) return;
        
        e.preventDefault();
        const deltaX = e.touches[0].clientX - this.startX;
        let newWidth = this.startWidth + deltaX;
        
        newWidth = Math.max(this.options.minWidth, newWidth);
        if (this.options.maxWidth) {
            newWidth = Math.min(this.options.maxWidth, newWidth);
        }
        
        this.element.style.width = `${newWidth}px`;
        this.options.onResize(newWidth);
    }

    onTouchEnd() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.handle.classList.remove('active');
        
        this.options.onResizeEnd();
    }

    destroy() {
        if (this.handle && this.handle.parentNode) {
            this.handle.parentNode.removeChild(this.handle);
        }
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
    }

    enable() {
        this.handle.style.pointerEvents = '';
    }

    disable() {
        this.handle.style.pointerEvents = 'none';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Resizable;
}
