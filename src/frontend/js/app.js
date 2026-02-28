/**
 * App - Main application controller
 * PlantUML Web - SCg Editor
 */

class App {
    constructor() {
        this.panelSystem = null;
        this.editorManager = null;
        this.assistantPanel = null;
        this.settingsModal = null;
        this.renderFactory = null;
        this.autoSaveTimer = null;
        
        this.init();
    }

    async init() {
        console.log('[App] Initializing...');
        
        this.initApiClient();
        this.initPanelSystem();
        this.initRenderFactory();
        this.initEditor();
        this.initAssistant();
        this.initSettings();
        this.initSession();
        this.initEventListeners();
        
        console.log('[App] Initialization complete');
    }

    initApiClient() {
        this.apiClient = apiClient;
    }

    initPanelSystem() {
        const container = document.getElementById('panel-container');
        this.panelSystem = new PanelSystem(container);
        this.panelSystem.loadPanelState();
    }

    initRenderFactory() {
        this.renderFactory = new RenderFactory(this.apiClient);
    }

    initEditor() {
        const editorContainer = this.panelSystem.getPanelContent('editor');
        
        this.editorManager = new EditorManager(editorContainer, {
            onChange: (type, value) => this.onEditorChange(type, value),
            onSwitch: (type) => this.onEditorSwitch(type),
        });
    }

    initAssistant() {
        const assistantContainer = this.panelSystem.getPanelContent('assistant');
        this.assistantPanel = new AssistantPanel(assistantContainer);
    }

    initSettings() {
        const modalContainer = document.getElementById('modal-container');
        this.settingsModal = new SettingsModal(modalContainer, {
            onSave: (settings) => this.onSettingsSave(settings),
        });
    }

    initSession() {
        this.loadSession();
        
        window.addEventListener('beforeunload', () => {
            this.saveSession();
        });
    }

    initEventListeners() {
        document.getElementById('btn-settings').addEventListener('click', () => {
            this.settingsModal.show();
        });
        
        document.getElementById('btn-render').addEventListener('click', () => {
            this.render();
        });
        
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveSession();
            this.showStatus('Session saved', 'success');
        });
        
        document.getElementById('btn-clear').addEventListener('click', () => {
            this.clearSession();
        });
        
        document.getElementById('btn-save-scs').addEventListener('click', () => {
            this.saveScsToFile();
        });
        
        document.getElementById('btn-load-scs').addEventListener('click', () => {
            this.loadScsFromFile();
        });
        
        document.getElementById('btn-sync-scweb').addEventListener('click', () => {
            this.syncFromScWeb();
        });
        
        const toolbarBtns = document.querySelectorAll('.toolbar-btn[data-mode]');
        toolbarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (mode === 'scs' || mode === 'scweb') {
                    this.editorManager.switchTo(mode);
                }
            });
        });
    }

    onEditorChange(type, value) {
        if (this.settings?.autoSave) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                this.saveSession();
            }, Config.EDITOR.AUTO_SAVE_DELAY);
        }
    }

    onEditorSwitch(type) {
        console.log('[App] Editor switched to:', type);
    }

    onSettingsSave(settings) {
        this.settings = settings;
        this.showStatus('Settings saved', 'success');
    }

    async render() {
        const imagePanel = this.panelSystem.getPanelContent('image');
        
        const loadingHtml = `
            <div class="loading-overlay">
                <div class="spinner"></div>
            </div>
            <div class="image-placeholder">
                <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div class="image-placeholder-text">Rendering...</div>
            </div>
        `;
        
        imagePanel.innerHTML = loadingHtml;
        
        try {
            const editorType = this.editorManager.currentEditor;
            const content = this.editorManager.getValue();
            
            if (!content) {
                imagePanel.innerHTML = `
                    <div class="image-placeholder">
                        <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <div class="image-placeholder-text">No content to render</div>
                        <div class="image-placeholder-hint">Enter some content in the editor</div>
                    </div>
                `;
                return;
            }
            
            const result = await this.renderFactory.render(editorType, content, {
                format: Config.RENDER.DEFAULT_FORMAT,
            });
            
            if (result && result.image) {
                imagePanel.innerHTML = `
                    <img class="image-preview" src="data:image/png;base64,${result.image}" alt="Rendered graph">
                `;
            } else {
                imagePanel.innerHTML = `
                    <div class="image-placeholder">
                        <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div class="image-placeholder-text">Empty result</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('[App] Render error:', error);
            imagePanel.innerHTML = `
                <div class="error-message">
                    Render error: ${error.message}
                </div>
            `;
        }
    }

    saveSession() {
        const session = {
            editorType: this.editorManager?.currentEditor,
            editorContent: this.editorManager?.getValue(),
            timestamp: new Date().toISOString(),
        };
        
        try {
            localStorage.setItem(Config.STORAGE_KEYS.SESSION, JSON.stringify(session));
        } catch (e) {
            console.warn('[App] Failed to save session:', e);
        }
    }

    loadSession() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.SESSION);
            if (saved) {
                const session = JSON.parse(saved);
                
                if (session.editorType && session.editorContent !== undefined) {
                    this.editorManager?.switchTo(session.editorType);
                    this.editorManager?.setValue(session.editorContent);
                }
                
                console.log('[App] Session loaded from:', session.timestamp);
            }
        } catch (e) {
            console.warn('[App] Failed to load session:', e);
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(Config.STORAGE_KEYS.SESSION);
            
            this.editorManager?.setValue('');
            
            const imagePanel = this.panelSystem.getPanelContent('image');
            imagePanel.innerHTML = `
                <div class="image-placeholder">
                    <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <div class="image-placeholder-text">Session cleared</div>
                    <div class="image-placeholder-hint">Click Render to generate image</div>
                </div>
            `;
            
            this.showStatus('Session cleared', 'success');
        } catch (e) {
            console.warn('[App] Failed to clear session:', e);
        }
    }

    saveScsToFile() {
        const content = this.editorManager.getValue();
        if (!content) {
            this.showStatus('Nothing to save', 'warning');
            return;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph.scs';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus('SCS saved to file', 'success');
    }
    
    loadScsFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.scs';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                this.editorManager.setValue(content);
                this.showStatus('SCS loaded from file', 'success');
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
    
    syncFromScWeb() {
        const iframe = document.querySelector('.scweb-editor-wrapper iframe');
        if (!iframe || !iframe.contentWindow) {
            this.showStatus('SC-Web not loaded', 'error');
            return;
        }
        
        try {
            const gwfContent = iframe.contentWindow.getGwfContent();
            if (!gwfContent) {
                this.showStatus('Failed to get graph from SC-Web', 'error');
                return;
            }
            
            this.showStatus('Synced from SC-Web (GWF received)', 'success');
            console.log('[App] GWF content:', gwfContent.substring(0, 200) + '...');
        } catch (err) {
            this.showStatus('Error syncing: ' + err.message, 'error');
        }
    }
    
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            
            setTimeout(() => {
                statusElement.textContent = '';
            }, 3000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
