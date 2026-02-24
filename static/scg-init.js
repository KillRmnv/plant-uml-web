// Конфигурация WebSocket
const SC_SERVER_URL = 'ws://localhost:5000/ws';

// Инициализация при загрузке
$(document).ready(function() {
    
    // Sandbox для SCg
    const sandbox = {
        container: 'scg-container',
        addr: 0,
        is_struct: false,
        format_addr: 'format_scg_json',
        
        resolveElementsAddr: async function(identifiers) {
            const response = await fetch('/api/elements/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifiers })
            });
            return await response.json();
        },
        
        canEdit: function() {
            return true;
        },
        
        createViewersForScLinks: function() {}
    };
    
    // Инициализация редактора
    const editor = new SCg.Editor();
    editor.init({
        containerId: 'scg-container',
        canEdit: true,
        sandbox: sandbox,
        
        autocompletionVariants: function(keyword, callback) {
            callback([]);
        },
        
        translateToSc: function(callback) {
            callback({});
        }
    });
    
    // Обработка клавиатуры
    $(window).on('keydown', function(e) {
        if (editor.keyboardCallbacks) {
            editor.keyboardCallbacks.onkeydown(e);
        }
    });
    
    $(window).on('keyup', function(e) {
        if (editor.keyboardCallbacks) {
            editor.keyboardCallbacks.onkeyup(e);
        }
    });
    
    window.scgEditor = editor;
});
