/**
 * Settings Modal - Settings management UI
 */

class SettingsModal {
    constructor(modalContainer, options = {}) {
        this.modalContainer = modalContainer;
        this.options = options;
        this.providers = [];
        this.models = [];
        this.settings = {};
        this.init();
    }

    init() {
        this.loadSettings();
        this.render();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.SETTINGS);
            if (saved) {
                this.settings = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[SettingsModal] Failed to load settings:', e);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem(Config.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('[SettingsModal] Failed to save settings:', e);
        }
    }

    render() {
        this.modalContainer.innerHTML = `
            <div class="modal-overlay" id="settings-overlay">
                <div class="modal settings-modal">
                    <div class="modal-header">
                        <span class="modal-title">Settings</span>
                        <button class="modal-close" id="settings-close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="settings-tabs">
                            <button class="settings-tab active" data-tab="assistant">Assistant</button>
                            <button class="settings-tab" data-tab="editor">Editor</button>
                        </div>
                        
                        <div class="settings-content">
                            <div class="settings-section" id="assistant-settings">
                                <div class="settings-section-title">AI Assistant</div>
                                
                                <div class="form-group">
                                    <label class="form-label">Provider</label>
                                    <select class="form-select" id="provider-select">
                                        <option value="">Select a provider...</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Model</label>
                                    <select class="form-select" id="model-select" disabled>
                                        <option value="">Select a model...</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">API Key (optional)</label>
                                    <div class="api-key-wrapper">
                                        <input type="password" class="form-input password" id="api-key" placeholder="Enter API key...">
                                        <button class="api-key-toggle" type="button">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="settings-section hidden" id="editor-settings">
                                <div class="settings-section-title">Editor</div>
                                
                                <div class="toggle-switch">
                                    <div class="toggle-switch-label">
                                        <span class="toggle-switch-title">Auto-save</span>
                                        <span class="toggle-switch-desc">Automatically save changes</span>
                                    </div>
                                    <label class="toggle-switch-input">
                                        <input type="checkbox" id="auto-save" checked>
                                        <span class="toggle-switch-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="settings-cancel">Cancel</button>
                        <button class="btn btn-primary" id="settings-save">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        this.bindEvents();
    }

    bindEvents() {
        const overlay = this.modalContainer.querySelector('#settings-overlay');
        const closeBtn = this.modalContainer.querySelector('#settings-close');
        const cancelBtn = this.modalContainer.querySelector('#settings-cancel');
        const saveBtn = this.modalContainer.querySelector('#settings-save');
        
        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());
        saveBtn.addEventListener('click', () => this.save());
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        });
        
        const tabs = this.modalContainer.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                document.getElementById('assistant-settings').classList.toggle('hidden', tabName !== 'assistant');
                document.getElementById('editor-settings').classList.toggle('hidden', tabName !== 'editor');
            });
        });
        
        const providerSelect = this.modalContainer.querySelector('#provider-select');
        providerSelect.addEventListener('change', () => {
            this.settings.provider = providerSelect.value;
            this.updateModelSelect();
        });
        
        const modelSelect = this.modalContainer.querySelector('#model-select');
        modelSelect.addEventListener('change', () => {
            this.settings.model = modelSelect.value;
        });
        
        const apiKeyInput = this.modalContainer.querySelector('#api-key');
        apiKeyInput.addEventListener('input', () => {
            this.settings.apiKey = apiKeyInput.value;
        });
        
        const apiKeyToggle = this.modalContainer.querySelector('.api-key-toggle');
        apiKeyToggle.addEventListener('click', () => {
            const type = apiKeyInput.type === 'password' ? 'text' : 'password';
            apiKeyInput.type = type;
        });
        
        const autoSaveToggle = this.modalContainer.querySelector('#auto-save');
        autoSaveToggle.addEventListener('change', () => {
            this.settings.autoSave = autoSaveToggle.checked;
        });
        
        this.populateProviders();
    }

    populateProviders() {
        const providerSelect = this.modalContainer.querySelector('#provider-select');
        
        const mockProviders = [
            { id: 'ollama', name: 'Ollama' },
            { id: 'lmstudio', name: 'LM Studio' },
            { id: 'openai', name: 'OpenAI' },
            { id: 'anthropic', name: 'Anthropic' },
        ];
        
        providerSelect.innerHTML = '<option value="">Select a provider...</option>';
        
        mockProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            if (this.settings.provider === provider.id) {
                option.selected = true;
            }
            providerSelect.appendChild(option);
        });
        
        if (this.settings.provider) {
            this.updateModelSelect();
        }
        
        if (this.settings.apiKey) {
            this.modalContainer.querySelector('#api-key').value = this.settings.apiKey;
        }
        
        this.modalContainer.querySelector('#auto-save').checked = this.settings.autoSave !== false;
    }

    updateModelSelect() {
        const modelSelect = this.modalContainer.querySelector('#model-select');
        const provider = this.modalContainer.querySelector('#provider-select').value;
        
        const models = {
            ollama: ['llama2', 'mistral', 'codellama', 'neural-chat'],
            lmstudio: ['llama2', 'mistral', 'codellama'],
            openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
            anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        };
        
        modelSelect.innerHTML = '<option value="">Select a model...</option>';
        
        if (provider && models[provider]) {
            modelSelect.disabled = false;
            
            models[provider].forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                if (this.settings.model === model) {
                    option.selected = true;
                }
                modelSelect.appendChild(option);
            });
        } else {
            modelSelect.disabled = true;
        }
    }

    show() {
        this.modalContainer.querySelector('#settings-overlay').classList.add('active');
    }

    hide() {
        this.modalContainer.querySelector('#settings-overlay').classList.remove('active');
    }

    save() {
        this.saveSettings();
        this.options.onSave?.(this.settings);
        this.hide();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModal;
}
