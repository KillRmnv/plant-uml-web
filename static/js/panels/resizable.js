/**
 * Resizable - Simple panel resize logic
 */

class Resizable {
    constructor(handle, leftPanel, rightPanel, options = {}) {
        this.handle = handle;
        this.leftPanel = leftPanel;
        this.rightPanel = rightPanel;
        this.options = {
            minWidth: options.minWidth || 150,
            onResizeEnd: options.onResizeEnd || (() => {}),
        };
        
        this.isResizing = false;
        this.isDisabled = false;
        this.startX = 0;
        this.startLeftWidth = 0;
        this.startRightWidth = 0;
        
        this.bindEvents();
    }

    bindEvents() {
        this.handle.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    disable() {
        this.isDisabled = true;
        this.handle.style.pointerEvents = 'none';
        this.handle.style.cursor = 'default';
        this.handle.style.opacity = '0.3';
    }

    enable() {
        this.isDisabled = false;
        this.handle.style.pointerEvents = '';
        this.handle.style.cursor = 'col-resize';
        this.handle.style.opacity = '';
    }

    onMouseDown(e) {
        if (e.button !== 0 || this.isDisabled) return;
        
        e.preventDefault();
        
        this.isResizing = true;
        this.startX = e.clientX;
        this.startLeftWidth = this.leftPanel.offsetWidth;
        this.startRightWidth = this.rightPanel.offsetWidth;
        
        this.handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    onMouseMove(e) {
        if (!this.isResizing || this.isDisabled) return;
        
        const deltaX = e.clientX - this.startX;
        
        let newLeftWidth = this.startLeftWidth + deltaX;
        let newRightWidth = this.startRightWidth - deltaX;
        
        if (newLeftWidth < this.options.minWidth) {
            newLeftWidth = this.options.minWidth;
            newRightWidth = this.startLeftWidth + this.startRightWidth - this.options.minWidth;
        }
        
        if (newRightWidth < this.options.minWidth) {
            newRightWidth = this.options.minWidth;
            newLeftWidth = this.startLeftWidth + this.startRightWidth - this.options.minWidth;
        }
        
        this.leftPanel.style.flex = 'none';
        this.rightPanel.style.flex = 'none';
        this.leftPanel.style.width = newLeftWidth + 'px';
        this.rightPanel.style.width = newRightWidth + 'px';
    }

    onMouseUp() {
        if (!this.isResizing || this.isDisabled) return;
        
        this.isResizing = false;
        this.handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        this.leftPanel.style.flex = '';
        this.rightPanel.style.flex = '';
        
        this.options.onResizeEnd();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Resizable;
}
