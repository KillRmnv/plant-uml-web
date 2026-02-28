/**
 * API Client - PlantUML Web SCg Editor
 * HTTP client for backend communication
 */

class ApiClient {
    constructor(baseUrl = Config.API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`[API] Error: ${endpoint}`, error);
            throw error;
        }
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    async render(content, type = 'scs', format = 'png') {
        return this.post('/render', { content, type, format });
    }

    async getProviders() {
        return this.get('/assistant/providers');
    }

    async getModels(provider) {
        return this.get(`/assistant/models?provider=${encodeURIComponent(provider)}`);
    }

    async sendMessage(chatId, message) {
        return this.post('/assistant/chat', { chat_id: chatId, message });
    }

    async getChats() {
        return this.get('/assistant/chats');
    }

    async createChat(title) {
        return this.post('/assistant/chats', { title });
    }

    async getChatMessages(chatId) {
        return this.get(`/assistant/chats/${chatId}/messages`);
    }

    async deleteChat(chatId) {
        return this.delete(`/assistant/chats/${chatId}`);
    }

    async getSettings() {
        return this.get('/settings');
    }

    async saveSettings(settings) {
        return this.post('/settings', settings);
    }

    async saveSession(sessionData) {
        return this.post('/session/save', sessionData);
    }

    async loadSession() {
        return this.get('/session/load');
    }

    async checkHealth() {
        return this.get('/health');
    }
}

const apiClient = new ApiClient();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, apiClient };
}
