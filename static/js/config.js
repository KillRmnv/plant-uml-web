/**
 * Configuration - PlantUML Web SCg Editor
 * Project configuration and constants
 */

const Config = {
    API_BASE_URL: '/api',
    
    PANELS: {
        DEFAULT_WIDTHS: [33.33, 33.33, 33.33],
        MIN_WIDTH: 200,
        MAX_WIDTH: 80,
    },
    
    EDITOR: {
        DEFAULT_TYPE: 'scs',
        AUTO_SAVE_DELAY: 1000,
    },
    
    RENDER: {
        DEFAULT_FORMAT: 'png',
        FORMATS: ['png', 'svg'],
    },
    
    ASSISTANT: {
        MAX_MESSAGE_LENGTH: 4000,
        TYPING_INDICATOR_DELAY: 300,
    },
    
    STORAGE_KEYS: {
        SESSION: 'plantuml_session',
        SETTINGS: 'plantuml_settings',
        PANEL_SIZES: 'plantuml_panel_sizes',
        PANEL_COLLAPSED: 'plantuml_panel_collapsed',
        CHATS: 'plantuml_chats',
        CURRENT_CHAT: 'plantuml_current_chat',
    },
    
    DEFAULTS: {
        SC_SERVER_URL: 'ws://localhost:8090/ws_json',
        RENDER_FORMAT: 'png',
        PROVIDER: null,
        MODEL: null,
        API_KEY: null,
    },
};

Object.freeze(Config);
Object.freeze(Config.PANELS);
Object.freeze(Config.EDITOR);
Object.freeze(Config.RENDER);
Object.freeze(Config.ASSISTANT);
Object.freeze(Config.STORAGE_KEYS);
Object.freeze(Config.DEFAULTS);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
