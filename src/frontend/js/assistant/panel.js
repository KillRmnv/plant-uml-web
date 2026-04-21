/**
 * Assistant Panel - Main AI assistant panel
 */

class AssistantPanel {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.apiClient = options.apiClient || window.apiClient;
        this.authManager = options.authManager || window.authManager;
        this.chatList = null;
        this.chatWindow = null;
        this.app = options.app || null;
        this.init();
    }

    init() {
        this.render();
        
        this.chatList = new ChatList(this.chatListContainer, {
            apiClient: this.apiClient,
            authManager: this.authManager,
            onChatCreated: (chat) => this.onChatCreated(chat),
            onChatSelected: (chatId) => this.onChatSelected(chatId),
            onChatDeleted: (chatId) => this.onChatDeleted(chatId),
        });
        
        this.chatWindow = new ChatWindow(this.chatWindowContainer, {
            onMessage: (content, isFirst, mode) => this.onMessage(content, isFirst, mode),
            onBack: () => this.showChatList(),
        });
        
        this.showChatList();
    }

    render() {
        this.container.innerHTML = `
            <div class="assistant-panel">
                <div class="chat-list-container" id="chat-list"></div>
                <div class="chat-window-container" id="chat-window"></div>
            </div>
        `;
        
        this.chatListContainer = this.container.querySelector('#chat-list');
        this.chatWindowContainer = this.container.querySelector('#chat-window');
    }

    onChatCreated(chat) {
        this.chatListContainer.style.display = 'none';
        this.chatWindowContainer.style.display = 'flex';
        this.chatWindow.setTitle(chat.title);
        this.chatWindow.clear();
    }

    onChatSelected(chatId) {
        const chat = this.chatList.chats.find(c => c.id === chatId);
        this.chatListContainer.style.display = 'none';
        this.chatWindowContainer.style.display = 'flex';
        this.chatWindow.setTitle(chat ? chat.title : 'Chat');
        this.loadChatMessages(chatId);
    }

    onChatDeleted(chatId) {
        if (this.chatList.chats.length === 0) {
            this.chatListContainer.style.display = 'block';
            this.chatWindowContainer.style.display = 'none';
        } else if (!this.chatList.currentChatId) {
            this.chatListContainer.style.display = 'block';
            this.chatWindowContainer.style.display = 'none';
        }
    }

    showChatList() {
        this.chatListContainer.style.display = 'block';
        this.chatWindowContainer.style.display = 'none';
    }

    async loadChatMessages(chatId) {
        const chat = this.chatList.chats.find(c => String(c.id) === String(chatId));
        if (this.apiClient?.isAuthenticated?.()) {
            try {
                const messages = await this.apiClient.getChatMessages(chatId);
                if (chat) {
                    chat.messages = messages;
                }
                this.chatWindow.setMessages(messages);
                return;
            } catch (e) {
                console.error('[AssistantPanel] Failed to load chat messages:', e);
            }
        }

        if (chat && chat.messages) {
            this.chatWindow.setMessages(chat.messages);
        }
    }

    async onMessage(content, isFirst, mode = 'assistant') {
        const chatId = this.chatList.currentChatId;
        if (!chatId) return;

        // Добавить сообщение пользователя
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString(),
        };

        this.chatList.addMessage(chatId, userMessage, isFirst);
        this.chatWindow.showTyping();

        try {
            // Получить настройки
            const settings = await this.apiClient.getSettings();
            const provider = settings?.provider || 'openrouter';

            const diagramCode = (this.app && this.app.lastPlantumlCode) ? this.app.lastPlantumlCode : '';

            // Вызвать API
            const model = settings?.model || null;
            console.log('[AssistantPanel] Sending request', {
                chatId,
                provider,
                model,
                mode,
                isFirst,
            });
            const response = await this.apiClient.sendMessage(chatId, content, mode, {
                provider: provider,
                model: model,
                diagram_code: diagramCode
            });

            const serverChatId = response.headers.get('X-Chat-ID');
            console.log('[AssistantPanel] Stream connected', {
                status: response.status,
                chatId: serverChatId || chatId,
            });
            if (serverChatId) {
                this.chatList.replaceChatId(chatId, serverChatId);
            }
            const activeChatId = serverChatId || chatId;

            // Обработать SSE поток
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            assistantContent += parsed.content || parsed.delta?.content || parsed.error || '';
                            this.chatWindow.updateLastAssistantMessage(assistantContent);
                        } catch (e) {
                            ///plain text
                            assistantContent += data;
                            this.chatWindow.updateLastAssistantMessage(assistantContent);
                        }
                    }
                }
            }

            // Сохранить ответ
            const assistantMessage = {
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date().toISOString(),
            };
            this.chatList.addMessage(activeChatId, assistantMessage);
            this.chatWindow.hideTyping();

        } catch (e) {
            console.error('[AssistantPanel] Error:', e);
            this.chatWindow.hideTyping();

            const errorMessage = {
                role: 'assistant',
                content: 'Ошибка: ' + (e.message || 'Unknown error'),
                timestamp: new Date().toISOString(),
            };
            this.chatList.addMessage(chatId, errorMessage);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssistantPanel;
}
