/**
 * Resizable - Fixed version: preserves size after drag
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
        
        // ФИКСАЦИЯ: Переключаем панели в режим фиксированной ширины
        this.leftPanel.style.flex = '0 0 auto';
        this.rightPanel.style.flex = '0 0 auto';
    }

    onMouseMove(e) {
        if (!this.isResizing || this.isDisabled) return;
        
        const deltaX = e.clientX - this.startX;
        
        let newLeftWidth = this.startLeftWidth + deltaX;
        let newRightWidth = this.startRightWidth - deltaX;
        
        // Ограничения минимальной ширины
        if (newLeftWidth < this.options.minWidth) {
            newLeftWidth = this.options.minWidth;
            newRightWidth = this.startLeftWidth + this.startRightWidth - this.options.minWidth;
        }
        
        if (newRightWidth < this.options.minWidth) {
            newRightWidth = this.options.minWidth;
            newLeftWidth = this.startLeftWidth + this.startRightWidth - this.options.minWidth;
        }
        
        // Применяем ширину напрямую
        this.leftPanel.style.width = newLeftWidth + 'px';
        this.rightPanel.style.width = newRightWidth + 'px';
    }

    onMouseUp(e) {
        if (!this.isResizing || this.isDisabled) return;
        
        this.isResizing = false;
        this.handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // === ГЛАВНОЕ ИСПРАВЛЕНИЕ ===
        // НЕ сбрасываем flex в ''! Оставляем '0 0 auto', чтобы width в пикселях работал.
        // Панели вернутся в flex: 1 1 0 только при вызове adjustPanelSizes() 
        // (при сворачивании другой панели или ресайзе окна)
        this.leftPanel.style.flex = '0 0 auto';
        this.rightPanel.style.flex = '0 0 auto';
        // ===========================
        
        this.options.onResizeEnd();
    }
}