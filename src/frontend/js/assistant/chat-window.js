/**
 * Chat Window - UI for chatting with AI assistant
 */

class ChatWindow {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.isTyping = false;
        this.isFirstMessage = true;
        this.currentMode = localStorage.getItem('assistantMode') || 'assistant';
        this.init();
    }

    init() {
        this.render();
    }

    render(title = 'Chat') {
        const assistantActive = this.currentMode === 'assistant' ? 'active' : '';
        const analystActive = this.currentMode === 'analyst' ? 'active' : '';
        
        this.container.innerHTML = `
            <div class="chat-window">
                <div class="chat-header">
                    <button class="panel-action-btn back-btn" title="Back to chats">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <span class="chat-header-title">${this.escapeHtml(title)}</span>
                    <div style="width: 32px;"></div>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="assistant-empty">
                        <svg class="assistant-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <div class="assistant-empty-title">AI Assistant</div>
                        <div class="assistant-empty-text">Start a conversation with the AI assistant. Your chats will be saved locally.</div>
                    </div>
                </div>
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            class="chat-input" 
                            placeholder="Type a message..." 
                            rows="1"
                        ></textarea>
                        <div class="mode-toggle">
                            <button class="mode-btn ${assistantActive}" data-mode="assistant">Помощник</button>
                            <button class="mode-btn ${analystActive}" data-mode="analyst">Аналитик</button>
                        </div>
                        <button class="chat-send-btn" disabled>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.bindEvents();
    }

    bindEvents() {
        const input = this.container.querySelector('.chat-input');
        const sendBtn = this.container.querySelector('.chat-send-btn');
        const backBtn = this.container.querySelector('.back-btn');
        const modeBtns = this.container.querySelectorAll('.mode-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.options.onBack?.();
            });
        }
        
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setMode(mode);
            });
        });
        
        input.addEventListener('input', () => {
            this.autoResize(input);
            sendBtn.disabled = !input.value.trim();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim()) {
                    this.sendMessage();
                }
            }
        });
        
        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.sendMessage();
            }
        });
        
        this.messagesContainer = this.container.querySelector('#chat-messages');
        this.input = input;
        this.sendBtn = sendBtn;
    }
    
    setMode(mode) {
        this.currentMode = mode;
        localStorage.setItem('assistantMode', mode);
        
        const modeBtns = this.container.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    sendMessage() {
        const content = this.input.value.trim();
        if (!content) return;
        
        const isFirst = this.isFirstMessage;
        this.isFirstMessage = false;
        
        this.addMessage('user', content);
        this.input.value = '';
        this.autoResize(this.input);
        this.sendBtn.disabled = true;
        
        this.options.onMessage?.(content, isFirst, this.currentMode);
        this.showTyping();
    }

    addMessage(role, content, animate = true) {
        if (this.messagesContainer.querySelector('.assistant-empty')) {
            this.messagesContainer.innerHTML = '';
        }
        
        const message = document.createElement('div');
        message.className = `message ${role}`;
        
        const avatarIcon = role === 'user' 
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path></svg>';
        
        const formatted = this.formatContent(content);
        message.innerHTML = `
            <div class="message-avatar">${avatarIcon}</div>
            <div class="message-content">
                <div class="message-text">${formatted}</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(message);
        this.scrollToBottom();
    }

    showTyping() {
        this.isTyping = true;
        const typing = document.createElement('div');
        typing.className = 'message assistant typing';
        typing.id = 'typing-indicator';
        typing.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                </svg>
            </div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        this.messagesContainer.appendChild(typing);
        this.scrollToBottom();
    }

    hideTyping() {
        const typing = this.messagesContainer.querySelector('#typing-indicator');
        if (typing) {
            typing.remove();
        }
        this.isTyping = false;
    }

formatContent(text) {
        if (typeof marked !== 'undefined') {
            const html = marked.parse(text);
            if (typeof DOMPurify !== 'undefined') {
                return DOMPurify.sanitize(html);
            }
            return html;
        }
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    updateLastAssistantMessage(content) {
        this.hideTyping();
        const lastMessage = this.messagesContainer.querySelector('.message.assistant:last-child');
        if (lastMessage) {
            const contentEl = lastMessage.querySelector('.message-text');
            if (contentEl) {
                contentEl.innerHTML = this.formatContent(content);
            }
        } else {
            this.addMessage('assistant', content);
        }
        this.scrollToBottom();
    }

    addAssistantMessage(content) {
        this.hideTyping();
        this.addMessage('assistant', content);
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setMessages(messages) {
        if (!messages || messages.length === 0) {
            this.render();
            return;
        }
        
        this.messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            this.addMessage(msg.role, msg.content, false);
        });
        
        if (messages.some(m => m.role === 'user')) {
            this.isFirstMessage = false;
        }
        
        this.scrollToBottom();
    }

    setTitle(title) {
        const titleEl = this.container.querySelector('.chat-header-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    clear() {
        this.isFirstMessage = true;
        this.render();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatWindow;
}
