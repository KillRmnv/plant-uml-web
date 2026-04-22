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
        this.apiClient = null;
        this._initPromise = null;
        this._rendered = false;
        if (options.apiClient) {
            this.setApiClient(options.apiClient);
        }
    }

    setApiClient(apiClient) {
        this.apiClient = apiClient;
    }

    clearLegacySettingsStorage() {
        try {
            localStorage.removeItem(Config.STORAGE_KEYS.SETTINGS);
        } catch (e) {
            console.warn('[SettingsModal] Failed to clear legacy settings cache:', e);
        }
    }

    async init() {
        if (this._initPromise) {
            return this._initPromise;
        }
        this._initPromise = (async () => {
            this.loadSettingsLocal();
            this.render();
        })();
        await this._initPromise;
    }

    loadSettingsLocal() {
        try {
            const saved = localStorage.getItem(Config.STORAGE_KEYS.SETTINGS);
            if (saved) {
                this.settings = JSON.parse(saved);
            } else {
                this.settings = {
                    provider: Config.DEFAULTS.PROVIDER || 'openrouter',
                    model: Config.DEFAULTS.MODEL || '',
                    autoSave: true,
                    api_keys: {}
                };
            }
            console.log('[SettingsModal] Settings loaded from localStorage:', this.settings);
        } catch (e) {
            console.warn('[SettingsModal] Failed to load settings:', e);
        }
    }

    async saveSettingsLocal() {
        try {
            localStorage.setItem(Config.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
            console.log('[SettingsModal] Settings saved to localStorage');
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
            this.settings.apiKey = this.settings.api_keys?.[this.settings.provider] || '';
            this.modalContainer.querySelector('#api-key').value = this.settings.apiKey;
            this.updateModelSelect();
        });
        
        const modelSelect = this.modalContainer.querySelector('#model-select');
        modelSelect.addEventListener('change', () => {
            this.settings.model = modelSelect.value;
        });
        
        const apiKeyInput = this.modalContainer.querySelector('#api-key');
        apiKeyInput.addEventListener('input', () => {
            this.settings.apiKey = apiKeyInput.value;
            if (this.settings.provider) {
                if (!this.settings.api_keys) {
                    this.settings.api_keys = {};
                }
                this.settings.api_keys[this.settings.provider] = apiKeyInput.value;
            }
            this.saveSettingsLocal();
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

        // Default providers (will be updated from API if available)
        const defaultProviders = [
            { id: 'openai', name: 'OpenAI' },
            { id: 'anthropic', name: 'Anthropic' },
            { id: 'mistral', name: 'Mistral' },
            { id: 'openrouter', name: 'OpenRouter' },
            { id: 'localai', name: 'LocalAI' },
        ];

        providerSelect.innerHTML = '<option value="">Select a provider...</option>';

        // Populate from API if available
        if (this.apiClient && this.providers.length > 0) {
            this.providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.name;
                if (this.settings.provider === provider.id) {
                    option.selected = true;
                }
                providerSelect.appendChild(option);
            });
        } else {
            defaultProviders.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.name;
                if (this.settings.provider === provider.id) {
                    option.selected = true;
                }
                providerSelect.appendChild(option);
            });
        }

        if (this.settings.provider) {
            this.updateModelSelect();
        }

        if (this.settings.apiKey) {
            this.modalContainer.querySelector('#api-key').value = this.settings.apiKey;
        }

        this.modalContainer.querySelector('#auto-save').checked = this.settings.autoSave !== false;
    }

    async updateModelSelect() {
        const modelSelect = this.modalContainer.querySelector('#model-select');
        const provider = this.modalContainer.querySelector('#provider-select').value;

        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        modelSelect.disabled = true;

        if (!provider) {
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            return;
        }

        // Check if API key exists for this provider
        const apiKey = this.settings.api_keys?.[provider];
        if (!apiKey) {
            modelSelect.innerHTML = '<option value="">Добавьте API ключ для выбора модели</option>';
            modelSelect.disabled = true;
            return;
        }

        // Try to get models from API
        if (this.apiClient) {
            try {
                console.log('[SettingsModal] Requesting models for provider:', provider);
                const response = await this.apiClient.getModels(provider);
                console.log('[SettingsModal] Raw response:', response);
                console.log('[SettingsModal] Response type:', typeof response);
                console.log('[SettingsModal] Response keys:', response ? Object.keys(response) : 'null');

                // Handle new response format with detail and models
                const models = response.models || response;
                const detail = response.detail;

                console.log('[SettingsModal] Parsed models:', models);
                console.log('[SettingsModal] Parsed model count:', models?.length);
                console.log('[SettingsModal] Parsed detail:', detail);

                if (detail && (!models || models.length === 0)) {
                    // API вернуло сообщение об ошибке
                    console.log('[SettingsModal] API returned detail:', detail);
                    modelSelect.innerHTML = `<option value="">${detail}</option>`;
                    modelSelect.disabled = true;
                    return;
                }

                this.models = models;

                modelSelect.innerHTML = '<option value="">Select a model...</option>';

                models.forEach(model => {
                    const option = document.createElement('option');
                    const modelId = typeof model === 'string' ? model : model.id;
                    const modelName = typeof model === 'string' ? model : (model.name || model.id);
                    option.value = modelId;
                    option.textContent = modelName;
                    if (this.settings.model === modelId) {
                        option.selected = true;
                    }
                    modelSelect.appendChild(option);
                });

                modelSelect.disabled = false;
                return;
            } catch (e) {
                console.warn('[SettingsModal] Failed to load models from API:', e);
                modelSelect.innerHTML = '<option value="">Ошибка загрузки моделей</option>';
                modelSelect.disabled = true;
                return;
            }
        }

        // No API client - show message
        modelSelect.innerHTML = '<option value="">API недоступен</option>';
        modelSelect.disabled = true;
    }

    async show() {
        if (this._initPromise) {
            await this._initPromise;
        } else if (this.apiClient || !this._rendered) {
            await this.init();
        } else {
            return;
        }
        this.modalContainer.querySelector('#settings-overlay').classList.add('active');
    }

    hide() {
        this.modalContainer.querySelector('#settings-overlay').classList.remove('active');
    }

    async save() {
        await this.saveSettingsLocal();
        this.options.onSave?.(this.settings);
        this.hide();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModal;
}
