/**
 * Chat List - Manages list of chats
 */

class ChatList {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.apiClient = options.apiClient || window.apiClient;
        this.authManager = options.authManager || window.authManager;
        this.chats = [];
        this.currentChatId = null;
        this.init();
    }

    async init() {
        await this.loadChats();
        this.render();
    }

    get isAuthenticated() {
        return Boolean(this.apiClient?.hasValidToken?.() || this.authManager?.isAuthenticated);
    }

    get storage() {
        return sessionStorage;
    }

    get chatsStorageKey() {
        return `${Config.STORAGE_KEYS.CHATS}_guest`;
    }

    get currentChatStorageKey() {
        return `${Config.STORAGE_KEYS.CURRENT_CHAT}_guest`;
    }

    async loadChats() {
        if (this.isAuthenticated && this.apiClient) {
            await this.loadFromApi();
            return;
        }
        this.loadFromStorage();
    }

    async loadFromApi() {
        try {
            const chats = await this.apiClient.getChats();
            this.chats = chats.map((chat) => ({
                ...chat,
                id: String(chat.id),
                messages: [],
                preview: chat.preview || '',
            }));
            this.currentChatId = this.chats[0]?.id || null;
        } catch (e) {
            console.warn('[ChatList] Failed to load chats from API:', e);
            this.chats = [];
            this.currentChatId = null;
        }
    }

    loadFromStorage() {
        try {
            const saved = this.storage.getItem(this.chatsStorageKey);
            if (saved) {
                this.chats = JSON.parse(saved);
            }
            const currentChat = this.storage.getItem(this.currentChatStorageKey);
            if (currentChat) {
                this.currentChatId = currentChat;
            }
        } catch (e) {
            console.warn('[ChatList] Failed to load chats:', e);
        }
    }

    saveToStorage() {
        try {
            this.storage.setItem(this.chatsStorageKey, JSON.stringify(this.chats));
            if (this.currentChatId) {
                this.storage.setItem(this.currentChatStorageKey, this.currentChatId);
            }
        } catch (e) {
            console.warn('[ChatList] Failed to save chats:', e);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-list-header">
                <span class="chat-list-title">Chats</span>
                <div class="chat-list-actions">
                    <button class="panel-action-btn" data-action="new-chat" title="New Chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chat-list">
                ${this.chats.map(chat => this.renderChatItem(chat)).join('')}
            </div>
        `;
        
        this.bindEvents();
    }

    renderChatItem(chat) {
        const isActive = chat.id === this.currentChatId;
        return `
            <div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-title">${chat.title}</div>
                    <div class="chat-item-preview">${chat.preview || 'No messages'}</div>
                </div>
                <button class="chat-item-delete" title="Delete Chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    bindEvents() {
        const newChatBtn = this.container.querySelector('[data-action="new-chat"]');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => void this.createNewChat());
        }
        
        const chatItems = this.container.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-item-delete')) {
                    const chatId = item.dataset.chatId;
                    this.selectChat(chatId);
                }
            });
            
            const deleteBtn = item.querySelector('.chat-item-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chatId = item.dataset.chatId;
                    void this.deleteChat(chatId);
                });
            }
        });
    }

    async createNewChat(title = 'New Chat') {
        if (this.isAuthenticated && this.apiClient) {
            try {
                const chat = await this.apiClient.createChat(title);
                const normalizedChat = {
                    ...chat,
                    id: String(chat.id),
                    preview: chat.preview || '',
                    messages: [],
                };

                this.chats.unshift(normalizedChat);
                this.selectChat(normalizedChat.id);
                this.render();

                this.options.onChatCreated?.(normalizedChat);
                return normalizedChat;
            } catch (e) {
                console.error('[ChatList] Failed to create chat via API:', e);
                return null;
            }
        }

        const chat = {
            id: Date.now().toString(),
            title: title,
            preview: '',
            createdAt: new Date().toISOString(),
            messages: [],
        };
        
        this.chats.unshift(chat);
        this.selectChat(chat.id);
        this.saveToStorage();
        this.render();
        
        this.options.onChatCreated?.(chat);
        return chat;
    }

    selectChat(chatId) {
        this.currentChatId = chatId;
        if (!this.isAuthenticated) {
            this.saveToStorage();
        }
        this.render();
        this.options.onChatSelected?.(chatId);
    }

    async deleteChat(chatId) {
        if (this.isAuthenticated && this.apiClient) {
            try {
                await this.apiClient.deleteChat(chatId);
            } catch (e) {
                console.error('[ChatList] Failed to delete chat via API:', e);
                return;
            }
        }

        this.chats = this.chats.filter(c => c.id !== chatId);
        
        if (this.currentChatId === chatId) {
            this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
        }
        
        this.saveToStorage();
        this.render();
        
        this.options.onChatDeleted?.(chatId);
    }

    getCurrentChat() {
        return this.chats.find(c => c.id === this.currentChatId);
    }

    addMessage(chatId, message, isFirst = false) {
        const chat = this.chats.find(c => String(c.id) === String(chatId));
        if (chat) {
            if (!Array.isArray(chat.messages)) {
                chat.messages = [];
            }
            chat.messages.push(message);
            chat.preview = message.content.substring(0, 50);
            
            if (isFirst && message.role === 'user') {
                chat.title = this.extractTitle(message.content);
            }
            
            if (!this.isAuthenticated) {
                this.saveToStorage();
            }
            this.render();
        }
    }

    replaceChatId(oldChatId, newChatId) {
        if (!oldChatId || !newChatId || oldChatId === newChatId) {
            return;
        }

        const chat = this.chats.find(c => c.id === oldChatId);
        if (!chat) {
            return;
        }

        chat.id = String(newChatId);
        if (this.currentChatId === oldChatId) {
            this.currentChatId = String(newChatId);
        }

        if (!this.isAuthenticated) {
            this.saveToStorage();
        }
        this.render();
    }
    
    extractTitle(text) {
        const firstSentence = text.split(/[.!?]/)[0].trim();
        if (firstSentence.length > 50) {
            return firstSentence.substring(0, 47) + '...';
        }
        return firstSentence || 'New Chat';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatList;
}
