class BusinessChatPlugin {
  constructor(config) {
    if (!config.uid) {
      console.error('BusinessChatPlugin: Widget ID is required');
      return;
    }

    this.widgetId = config.uid;
    this.supabaseUrl = 'https://tkimzusnrpcbxrtliyji.supabase.co';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraW16dXNucnBjYnhydGxpeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Nzc2NTksImV4cCI6MjA1NzQ1MzY1OX0.OMFJ9WHQQR3aUrq4zNb-Rs1K0teeJkCBI5AHIvMFn3s';
    this.widgetSettings = {
      business_name: 'Chat Support',
      primary_color: '#3B82F6',
      welcome_message: 'Welcome! How can we help you today?',
      quick_questions: []
    };
    this.conversationId = null;
    this.messages = [];
    this.isOpen = false;
    this.unreadCount = 0;
    this.elements = {};
    this.styles = {
      container: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      button: {
        width: '56px',
        height: '56px',
        borderRadius: '28px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        backgroundColor: '#3B82F6',
        color: '#ffffff',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        outline: 'none'
      },
      chatWindow: {
        display: 'none',
        position: 'absolute',
        bottom: '80px',
        right: '0',
        width: '380px',
        height: '600px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        flexDirection: 'column',
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        opacity: '0',
        transform: 'translateY(20px)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      },
      header: {
        padding: '16px 20px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#fff'
      },
      messagesContainer: {
        flex: '1',
        overflowY: 'auto',
        padding: '20px',
        scrollBehavior: 'smooth',
        backgroundColor: '#f8fafc'
      },
      inputContainer: {
        padding: '16px 20px',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '12px',
        backgroundColor: '#fff',
        position: 'relative',
        zIndex: '1'
      },
      input: {
        flex: '1',
        padding: '12px 16px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '24px',
        outline: 'none',
        backgroundColor: '#fff',
        fontSize: '14px',
        transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
      },
      sendButton: {
        padding: '12px',
        border: 'none',
        borderRadius: '24px',
        cursor: 'pointer',
        backgroundColor: '#3B82F6',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
        outline: 'none'
      },
      unreadBadge: {
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '12px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        border: '2px solid #fff',
        minWidth: '20px',
        height: '20px',
        textAlign: 'center',
        lineHeight: '16px'
      },
      message: {
        maxWidth: '70%',
        padding: '12px 16px',
        borderRadius: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
        position: 'relative',
        marginBottom: '12px'
      },
      visitorMessage: {
        backgroundColor: '#fff',
        color: '#1f2937',
        marginLeft: 'auto',
        borderTopRightRadius: '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
      },
      agentMessage: {
        backgroundColor: '#3B82F6',
        color: '#fff',
        marginRight: 'auto',
        borderTopLeftRadius: '4px'
      },
      quickQuestion: {
        display: 'block',
        width: '100%',
        padding: '12px 16px',
        marginBottom: '8px',
        backgroundColor: '#fff',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '14px',
        color: '#374151',
        transition: 'all 0.2s ease-in-out'
      },
      timestamp: {
        fontSize: '11px',
        opacity: '0.7',
        marginTop: '4px',
        display: 'block'
      }
    };

    this.init();
  }

  async init() {
    this.createWidget();
    await this.initSupabase();
    await this.loadSettings();
    this.subscribeToMessages();
    this.addEventListeners();
  }

  addEventListeners() {
    // Add hover effects for the chat button
    this.elements.button.addEventListener('mouseenter', () => {
      this.elements.button.style.transform = 'scale(1.05)';
      this.elements.button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    });

    this.elements.button.addEventListener('mouseleave', () => {
      this.elements.button.style.transform = 'scale(1)';
      this.elements.button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Add focus styles for the input
    this.elements.input.addEventListener('focus', () => {
      this.elements.input.style.borderColor = this.widgetSettings.primary_color;
      this.elements.input.style.boxShadow = `0 0 0 3px ${this.widgetSettings.primary_color}25`;
    });

    this.elements.input.addEventListener('blur', () => {
      this.elements.input.style.borderColor = 'rgba(0, 0, 0, 0.1)';
      this.elements.input.style.boxShadow = 'none';
    });

    // Add hover effect for the send button
    this.elements.sendButton.addEventListener('mouseenter', () => {
      this.elements.sendButton.style.transform = 'scale(1.05)';
    });

    this.elements.sendButton.addEventListener('mouseleave', () => {
      this.elements.sendButton.style.transform = 'scale(1)';
    });
  }

  async initSupabase() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
  }

  async loadSettings() {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      const { data: settings, error: settingsError } = await this.supabase
        .from('widget_settings')
        .select('*')
        .eq('id', this.widgetId)
        .single();

      if (settingsError) throw settingsError;

      const { data: questions, error: questionsError } = await this.supabase
        .from('quick_questions')
        .select('*')
        .eq('widget_id', this.widgetId)
        .order('question_order', { ascending: true });

      if (questionsError) throw questionsError;

      this.widgetSettings = {
        ...settings,
        quick_questions: questions || []
      };

      this.updateWidgetStyles();
    } catch (error) {
      console.error('Error loading widget settings:', error);
      this.updateWidgetStyles();
    }
  }

  createWidget() {
    // Create widget container
    this.elements.container = document.createElement('div');
    this.elements.container.id = 'business-chat-widget';
    this.applyStyles(this.elements.container, this.styles.container);

    // Create widget button
    this.elements.button = document.createElement('button');
    this.applyStyles(this.elements.button, this.styles.button);
    this.elements.button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    this.elements.button.setAttribute('aria-label', 'Open chat');
    this.elements.button.onclick = () => this.toggleWidget();

    // Create chat window
    this.elements.chatWindow = document.createElement('div');
    this.applyStyles(this.elements.chatWindow, this.styles.chatWindow);

    // Create header
    this.elements.header = document.createElement('div');
    this.applyStyles(this.elements.header, this.styles.header);

    // Create messages container
    this.elements.messagesContainer = document.createElement('div');
    this.applyStyles(this.elements.messagesContainer, this.styles.messagesContainer);

    // Create input container
    this.elements.inputContainer = document.createElement('div');
    this.applyStyles(this.elements.inputContainer, this.styles.inputContainer);

    // Create message input
    this.elements.input = document.createElement('input');
    this.elements.input.type = 'text';
    this.elements.input.placeholder = 'Type your message...';
    this.applyStyles(this.elements.input, this.styles.input);
    this.elements.input.onkeypress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };

    // Create send button
    this.elements.sendButton = document.createElement('button');
    this.elements.sendButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    this.elements.sendButton.setAttribute('aria-label', 'Send message');
    this.applyStyles(this.elements.sendButton, this.styles.sendButton);
    this.elements.sendButton.onclick = () => this.sendMessage();

    // Create unread badge
    this.elements.unreadBadge = document.createElement('div');
    this.applyStyles(this.elements.unreadBadge, this.styles.unreadBadge);
    this.elements.button.appendChild(this.elements.unreadBadge);

    // Assemble the widget
    this.elements.inputContainer.appendChild(this.elements.input);
    this.elements.inputContainer.appendChild(this.elements.sendButton);
    this.elements.chatWindow.appendChild(this.elements.header);
    this.elements.chatWindow.appendChild(this.elements.messagesContainer);
    this.elements.chatWindow.appendChild(this.elements.inputContainer);
    this.elements.container.appendChild(this.elements.chatWindow);
    this.elements.container.appendChild(this.elements.button);
    document.body.appendChild(this.elements.container);
  }

  updateWidgetStyles() {
    if (!this.widgetSettings) return;

    const primaryColor = this.widgetSettings.primary_color || '#3B82F6';

    // Update button styles
    this.applyStyles(this.elements.button, {
      ...this.styles.button,
      backgroundColor: primaryColor
    });

    // Update send button styles
    this.applyStyles(this.elements.sendButton, {
      ...this.styles.sendButton,
      backgroundColor: primaryColor
    });

    // Update header with business name
    if (this.elements.header) {
      this.elements.header.innerHTML = `
        <div class="chat-header" style="display: flex; align-items: center; gap: 12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: ${primaryColor}; font-size: 16px;">
              ${this.widgetSettings.business_name || 'Chat Support'}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
              We typically reply within a few minutes
            </div>
          </div>
        </div>
      `;
    }

    // Update welcome message and quick questions
    if (!this.conversationId && this.elements.messagesContainer) {
      const quickQuestions = this.widgetSettings.quick_questions || [];
      const welcomeMessage = this.widgetSettings.welcome_message || 'Welcome! How can we help you today?';

      this.elements.messagesContainer.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="background-color: #fff; padding: 16px; border-radius: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); color: #1f2937; font-size: 15px; line-height: 1.5;">
            ${welcomeMessage}
          </div>
          <div style="margin-top: 20px;">
            ${quickQuestions.map((q) => `
              <button
                onclick="window.businessChat.sendQuickQuestion('${q.question}')"
                class="quick-question"
                style="
                  display: block;
                  width: 100%;
                  padding: 12px 16px;
                  margin-bottom: 8px;
                  background-color: #fff;
                  border: 1px solid rgba(0, 0, 0, 0.1);
                  border-radius: 12px;
                  cursor: pointer;
                  text-align: left;
                  font-size: 14px;
                  color: #374151;
                  transition: all 0.2s ease-in-out;
                "
                onmouseover="this.style.backgroundColor='${primaryColor}'; this.style.color='white'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.05)';"
                onmouseout="this.style.backgroundColor='#fff'; this.style.color='#374151'; this.style.transform='translateY(0)'; this.style.boxShadow='none';"
              >
                ${q.question}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  async createConversation() {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          widget_id: this.widgetId,
          visitor_name: 'Visitor',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.conversationId = data.id;
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async sendMessage(content = this.elements.input.value.trim()) {
    if (!content || !this.supabase) return;

    if (!this.conversationId) {
      const conversation = await this.createConversation();
      if (!conversation) {
        console.error('Failed to create conversation');
        return;
      }
    }

    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: this.conversationId,
          content,
          is_from_visitor: true,
          type: 'message'
        });

      if (error) {
        throw error;
      }

      this.elements.input.value = '';
      await this.loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  sendQuickQuestion(question) {
    this.sendMessage(question);
  }

  async loadMessages() {
    if (!this.conversationId || !this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', this.conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      this.messages = data;
      this.renderMessages();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  renderMessages() {
    if (!this.widgetSettings || !this.elements.messagesContainer) return;

    this.elements.messagesContainer.innerHTML = this.messages
      .map((message) => {
        const isVisitor = message.is_from_visitor;
        const messageStyles = {
          ...this.styles.message,
          ...(isVisitor ? this.styles.visitorMessage : this.styles.agentMessage)
        };

        return `
          <div style="
            display: flex;
            justify-content: ${isVisitor ? 'flex-end' : 'flex-start'};
            margin-bottom: 16px;
          ">
            <div style="${Object.entries(messageStyles)
              .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
              .join(';')}">
              ${message.content}
              <span style="${Object.entries(this.styles.timestamp)
                .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
                .join(';')}">
                ${this.formatTimestamp(message.created_at)}
              </span>
            </div>
          </div>
        `;
      })
      .join('');

    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  }

  subscribeToMessages() {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    this.supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (
            payload.new.conversation_id === this.conversationId &&
            !payload.new.is_from_visitor
          ) {
            this.messages.push(payload.new);
            this.renderMessages();
            if (!this.isOpen) {
              this.unreadCount++;
              this.updateUnreadBadge();
            }
          }
        }
      )
      .subscribe();
  }

  updateUnreadBadge() {
    if (!this.elements.unreadBadge) return;

    if (this.unreadCount > 0) {
      this.elements.unreadBadge.style.display = 'flex';
      this.elements.unreadBadge.style.alignItems = 'center';
      this.elements.unreadBadge.style.justifyContent = 'center';
      this.elements.unreadBadge.textContent = this.unreadCount;
    } else {
      this.elements.unreadBadge.style.display = 'none';
    }
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    if (this.elements.chatWindow) {
      this.elements.chatWindow.style.display = this.isOpen ? 'flex' : 'none';
      if (this.isOpen) {
        // Add a small delay to ensure the display change has taken effect
        setTimeout(() => {
          this.elements.chatWindow.style.opacity = '1';
          this.elements.chatWindow.style.transform = 'translateY(0)';
        }, 50);
      } else {
        this.elements.chatWindow.style.opacity = '0';
        this.elements.chatWindow.style.transform = 'translateY(20px)';
      }
    }
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateUnreadBadge();
      this.loadMessages();
      if (this.elements.input) {
        this.elements.input.focus();
      }
    }
  }

  applyStyles(element, styles) {
    if (!element || !element.style) return;
    Object.assign(element.style, styles);
  }
}

// Initialize the chat widget
window.businessChat = null;

const initChat = () => {
  if (window.businessChatConfig && window.businessChatConfig.uid) {
    window.businessChat = new BusinessChatPlugin(window.businessChatConfig);
  } else {
    console.error('BusinessChatPlugin: Configuration not found');
  }
};

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}