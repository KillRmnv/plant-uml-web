/**
 * Assistant Panel - Main AI assistant panel
 */

class AssistantPanel {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.chatList = null;
        this.chatWindow = null;
        this.init();
    }

    init() {
        this.render();
        
        this.chatList = new ChatList(this.chatListContainer, {
            onChatCreated: (chat) => this.onChatCreated(chat),
            onChatSelected: (chatId) => this.onChatSelected(chatId),
            onChatDeleted: (chatId) => this.onChatDeleted(chatId),
        });
        
        this.chatWindow = new ChatWindow(this.chatWindowContainer, {
            onMessage: (content, isFirst) => this.onMessage(content, isFirst),
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
        const chat = this.chatList.chats.find(c => c.id === chatId);
        if (chat && chat.messages) {
            this.chatWindow.setMessages(chat.messages);
        }
    }

    onMessage(content, isFirst) {
        const chatId = this.chatList.currentChatId;
        if (!chatId) return;
        
        const message = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString(),
        };
        
        this.chatList.addMessage(chatId, message, isFirst);
        
        const assistantMessage = {
            role: 'assistant',
            content: 'AI response will appear here when backend is connected.',
            timestamp: new Date().toISOString(),
        };
        
        this.chatList.addMessage(chatId, assistantMessage);
        this.chatWindow.addAssistantMessage(assistantMessage.content);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssistantPanel;
}
