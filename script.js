import EbiosConfig from './config.js';

class EbiosAI {
    constructor() {
        this.sessionId = EbiosConfig.getSessionId();
        this.messages = [];
        this.isTyping = false;
        this.currentFeature = 'chat';
        
        this.initializeApp();
        this.bindEvents();
        this.showWelcomeMessage();
        this.loadFeatures();
    }
    
    initializeApp() {
        // Tạo các phần tử UI động
        this.createDynamicElements();
        
        // Kiểm tra kết nối server
        this.checkServerStatus();
        
        // Khởi tạo textarea auto-resize
        this.initTextarea();
        
        // Load chat history từ localStorage
        this.loadChatHistory();
    }
    
    createDynamicElements() {
        // Tạo container cho typing indicator
        const typingContainer = document.createElement('div');
        typingContainer.className = 'typing-indicator hidden';
        typingContainer.id = 'typingIndicator';
        typingContainer.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        document.querySelector('.messages-container').appendChild(typingContainer);
        
        // Tạo notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        document.body.appendChild(notificationContainer);
    }
    
    bindEvents() {
        // Gửi tin nhắn
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Xóa lịch sử
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        
        // Quick prompts
        document.querySelectorAll('.quick-prompt').forEach(button => {
            button.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                document.getElementById('messageInput').value = prompt;
                this.sendMessage();
            });
        });
        
        // Feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const feature = e.target.closest('.feature-card').dataset.feature;
                this.useFeature(feature);
            });
        });
        
        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.target.closest('.nav-item').dataset.section;
                this.switchSection(section);
            });
        });
        
        // Auto-resize textarea
        const textarea = document.getElementById('messageInput');
        textarea.addEventListener('input', () => {
            this.autoResizeTextarea(textarea);
        });
    }
    
    initTextarea() {
        const textarea = document.getElementById('messageInput');
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }
    
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch(`${EbiosConfig.API_BASE_URL}/api/health`);
            const data = await response.json();
            
            const statusBadge = document.querySelector('.status-badge');
            if (data.status === 'online') {
                statusBadge.innerHTML = `
                    <div class="status-dot"></div>
                    Ebios AI 1.5 - Online
                `;
                this.showNotification('Kết nối thành công với Ebios AI 1.5', 'success');
            }
        } catch (error) {
            console.error('Không thể kết nối đến server:', error);
            this.showNotification('Không thể kết nối đến server. Vui lòng thử lại.', 'error');
        }
    }
    
    showWelcomeMessage() {
        const welcomeMessage = {
            type: 'assistant',
            content: EbiosConfig.CHAT.initialGreeting,
            timestamp: new Date().toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        this.addMessageToUI(welcomeMessage);
        this.messages.push(welcomeMessage);
    }
    
    loadFeatures() {
        const featuresGrid = document.querySelector('.features-grid-main');
        if (!featuresGrid) return;
        
        featuresGrid.innerHTML = EbiosConfig.getFeatureCards().map(card => `
            <div class="feature-card" data-feature="${card.title.toLowerCase()}">
                <div class="feature-icon">${card.icon}</div>
                <h3>${card.title}</h3>
                <p>${card.description}</p>
            </div>
        `).join('');
        
        // Re-bind events for new cards
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const feature = e.target.closest('.feature-card').dataset.feature;
                this.useFeature(feature);
            });
        });
    }
    
    useFeature(feature) {
        const prompts = {
            'lập trình & công nghệ': 'Anh có thể giải thích về [chủ đề công nghệ] và hướng dẫn em cách áp dụng không?',
            'game development': 'Anh có thể tư vấn về phát triển game với [engine/ngôn ngữ] không?',
            'học tập & nghiên cứu': 'Anh có thể giúp em giải thích khái niệm [tên khái niệm] không?',
            'tra cứu thông tin': 'Anh có thể tìm thông tin về [chủ đề] giúp em không?',
            'ai assistant': 'Anh có thể giúp em [công việc] với sự hỗ trợ của AI không?',
            'sáng tạo nội dung': 'Anh có thể giúp em viết về [chủ đề sáng tạo] không?'
        };
        
        const prompt = prompts[feature] || 'Anh có thể giúp gì cho em về ' + feature + '?';
        document.getElementById('messageInput').value = prompt;
        this.showNotification(`Đã chọn tính năng: ${feature}`, 'info');
    }
    
    switchSection(section) {
        this.currentFeature = section;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });
        
        // Show/hide sections
        document.querySelectorAll('.section-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        this.showNotification(`Đã chuyển đến ${section}`, 'info');
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Thêm tin nhắn người dùng
        const userMessage = {
            type: 'user',
            content: message,
            timestamp: new Date().toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        this.addMessageToUI(userMessage);
        this.messages.push(userMessage);
        
        // Xóa input và reset chiều cao
        input.value = '';
        input.style.height = 'auto';
        
        // Cuộn xuống cuối
        this.scrollToBottom();
        
        // Hiển thị typing indicator
        this.showTypingIndicator();
        
        try {
            // Gửi đến server
            const response = await fetch(`${EbiosConfig.API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ẩn typing indicator
            this.hideTypingIndicator();
            
            // Thêm phản hồi từ AI
            const aiMessage = {
                type: 'assistant',
                content: data.response,
                timestamp: new Date().toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
            
            this.addMessageToUI(aiMessage, true);
            this.messages.push(aiMessage);
            
            // Lưu vào lịch sử
            this.saveChatHistory();
            
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            this.hideTypingIndicator();
            
            // Hiển thị lỗi
            const errorMessage = {
                type: 'assistant',
                content: 'Xin lỗi em, có lỗi xảy ra khi kết nối đến AI. Anh là Ebios AI offline, anh vẫn có thể giúp em với các tính năng cơ bản.',
                timestamp: new Date().toLocaleTimeString('vi-VN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
            
            this.addMessageToUI(errorMessage);
            this.messages.push(errorMessage);
        }
        
        this.scrollToBottom();
    }
    
    addMessageToUI(message, isStreaming = false) {
        const messagesContainer = document.querySelector('.messages-container');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <div class="avatar">
                        ${message.type === 'user' ? '👤' : '🤖'}
                    </div>
                    <div class="username">
                        ${message.type === 'user' ? 'Bạn' : 'Ebios AI 1.5'}
                    </div>
                    <div class="timestamp">${message.timestamp}</div>
                </div>
                <div class="message-text">${message.content}</div>
            </div>
        `;
        
        // Chèn trước typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            messagesContainer.insertBefore(messageElement, typingIndicator);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        // Nếu là streaming, thêm hiệu ứng gõ chữ
        if (isStreaming) {
            this.typeWriterEffect(messageElement.querySelector('.message-text'), message.content);
        }
    }
    
    typeWriterEffect(element, text, speed = EbiosConfig.CHAT.typingSpeed) {
        element.innerHTML = '';
        let i = 0;
        
        const type = () => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
                this.scrollToBottom();
            }
        };
        
        type();
    }
    
    showTypingIndicator() {
        this.isTyping = true;
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            this.scrollToBottom();
        }
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    async clearHistory() {
        if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
            try {
                await fetch(`${EbiosConfig.API_BASE_URL}/api/clear-history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: this.sessionId
                    })
                });
                
                // Xóa local
                this.messages = [];
                document.querySelector('.messages-container').innerHTML = '';
                
                // Tạo lại typing indicator
                this.createDynamicElements();
                
                // Hiển thị lại welcome message
                this.showWelcomeMessage();
                
                this.showNotification('Đã xóa lịch sử chat', 'success');
                
            } catch (error) {
                console.error('Lỗi khi xóa lịch sử:', error);
                this.showNotification('Không thể xóa lịch sử', 'error');
            }
        }
    }
    
    saveChatHistory() {
        try {
            localStorage.setItem(`ebios_chat_${this.sessionId}`, JSON.stringify(this.messages));
        } catch (error) {
            console.error('Lỗi khi lưu lịch sử:', error);
        }
    }
    
    loadChatHistory() {
        try {
            const saved = localStorage.getItem(`ebios_chat_${this.sessionId}`);
            if (saved) {
                const history = JSON.parse(saved);
                
                // Chỉ load tin nhắn không phải welcome message
                history.forEach(msg => {
                    if (msg.content !== EbiosConfig.CHAT.initialGreeting) {
                        this.addMessageToUI(msg);
                        this.messages.push(msg);
                    }
                });
                
                if (history.length > 0) {
                    this.scrollToBottom();
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải lịch sử:', error);
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        
        notification.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Tự động xóa sau 3 giây
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Khởi tạo ứng dụng khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    window.ebiosAI = new EbiosAI();
    
    // Thêm hiệu ứng cho các phần tử khi load
    document.querySelectorAll('.feature-card, .message').forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
});