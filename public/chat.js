class BusinessChatPlugin {
  constructor(config) {
    if (!config.uid) {
      console.error('BusinessChatPlugin: Widget ID is required');
      return;
    }

    this.widgetId = config.uid;
    this.supabaseUrl = 'https://tkimzusnrpcbxrtliyji.supabase.co';
    this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRraW16dXNucnBjYnhydGxpeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Nzc2NTksImV4cCI6MjA1NzQ1MzY1OX0.OMFJ9WHQQR3aUrq4zNb-Rs1K0teeJkCBI5AHIvMFn3s';
    this.widgetSettings = null;
    this.conversationId = null;
    this.messages = [];
    this.isOpen = false;
    this.unreadCount = 0;
    this.styles = {
      container: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      button: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        backgroundColor: '#3B82F6',
        color: '#ffffff'
      },
      chatWindow: {
        display: 'none',
        position: 'absolute',
        bottom: '80px',
        right: '0',
        width: '350px',
        height: '500px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        flexDirection: 'column'
      },
      header: {
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      messagesContainer: {
        flex: '1',
        overflowY: 'auto',
        padding: '16px'
      },
      inputContainer: {
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '8px',
        backgroundColor: '#fff',
        position: 'relative',
        zIndex: '1'
      },
      input: {
        flex: '1',
        padding: '8px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        outline: 'none',
        backgroundColor: '#fff'
      },
      sendButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#3B82F6',
        color: '#ffffff'
      },
      unreadBadge: {
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '9999px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'none'
      },
      quickQuestion: {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        margin: '4px 0',
        background: '#f3f4f6',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        color: '#374151',
        transition: 'all 0.2s'
      }
    };

    this.init();
  }

  async init() {
    await this.initSupabase();
    await this.loadSettings();
    this.createWidget();
    this.subscribeToMessages();
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
      // Set default values if settings can't be loaded
      this.widgetSettings = {
        business_name: 'Chat Support',
        primary_color: '#3B82F6',
        welcome_message: 'Welcome! How can we help you today?',
        quick_questions: []
      };
      this.updateWidgetStyles();
    }
  }

  getStyle(element) {
    return { ...this.styles[element] };
  }

  applyStyles(element, styles) {
    Object.assign(element.style, styles);
  }

  createWidget() {
    // Create widget container
    this.container = document.createElement('div');
    this.container.id = 'business-chat-widget';
    this.applyStyles(this.container, this.getStyle('container'));

    // Create widget button
    this.button = document.createElement('button');
    this.applyStyles(this.button, this.getStyle('button'));
    this.button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    this.button.onclick = () => this.toggleWidget();

    // Create chat window
    this.chatWindow = document.createElement('div');
    this.applyStyles(this.chatWindow, this.getStyle('chatWindow'));

    // Create header
    this.header = document.createElement('div');
    this.applyStyles(this.header, this.getStyle('header'));

    // Create messages container
    this.messagesContainer = document.createElement('div');
    this.applyStyles(this.messagesContainer, this.getStyle('messagesContainer'));

    // Create input container
    this.inputContainer = document.createElement('div');
    this.applyStyles(this.inputContainer, this.getStyle('inputContainer'));

    // Create message input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Type your message...';
    this.applyStyles(this.input, this.getStyle('input'));
    this.input.onkeypress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };

    // Create send button
    this.sendButton = document.createElement('button');
    this.sendButton.innerHTML = 'Send';
    this.applyStyles(this.sendButton, this.getStyle('sendButton'));
    this.sendButton.onclick = () => this.sendMessage();

    // Create unread badge
    this.unreadBadge = document.createElement('div');
    this.applyStyles(this.unreadBadge, this.getStyle('unreadBadge'));
    this.button.appendChild(this.unreadBadge);

    // Assemble the widget
    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);
    this.chatWindow.appendChild(this.header);
    this.chatWindow.appendChild(this.messagesContainer);
    this.chatWindow.appendChild(this.inputContainer);
    this.container.appendChild(this.chatWindow);
    this.container.appendChild(this.button);
    document.body.appendChild(this.container);

    // Initialize with default styles
    this.updateWidgetStyles();
  }

  updateWidgetStyles() {
    if (!this.widgetSettings) return;

    const primaryColor = this.widgetSettings.primary_color || '#3B82F6';

    // Update button styles
    this.applyStyles(this.button, {
      ...this.getStyle('button'),
      backgroundColor: primaryColor,
      color: '#ffffff'
    });

    // Update send button styles
    this.applyStyles(this.sendButton, {
      ...this.getStyle('sendButton'),
      backgroundColor: primaryColor,
      color: '#ffffff'
    });

    // Update header with business name
    this.header.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <div>
        <div style="font-weight: 600; color: ${primaryColor}">${this.widgetSettings.business_name || 'Chat Support'}</div>
      </div>
    `;

    // Update welcome message and quick questions
    if (!this.conversationId) {
      const quickQuestions = this.widgetSettings.quick_questions || [];

      this.messagesContainer.innerHTML = `
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #374151;">${this.widgetSettings.welcome_message || 'Welcome! How can we help you today?'}</p>
          ${quickQuestions.map((q) => `
            <button
              onclick="window.businessChat.sendQuickQuestion('${q.question}')"
              onmouseover="this.style.backgroundColor='${primaryColor}'; this.style.color='white';"
              onmouseout="this.style.backgroundColor='#f3f4f6'; this.style.color='#374151';"
              style="display: block; width: 100%; text-align: left; padding: 8px 12px; margin: 4px 0; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; color: #374151; transition: all 0.2s;"
            >
              ${q.question}
            </button>
          `).join('')}
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

  async sendMessage(content = this.input.value.trim()) {
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
        });

      if (error) {
        throw error;
      }

      this.input.value = '';
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

  renderMessages() {
    if (!this.widgetSettings) return;

    this.messagesContainer.innerHTML = this.messages
      .map(
        (message) => `
          <div style="
            display: flex;
            justify-content: ${message.is_from_visitor ? 'flex-end' : 'flex-start'};
            margin-bottom: 12px;
          ">
            <div style="
              max-width: 70%;
              padding: 8px 12px;
              border-radius: 12px;
              background-color: ${
                message.is_from_visitor
                  ? this.widgetSettings.primary_color
                  : '#f3f4f6'
              };
              color: ${message.is_from_visitor ? '#ffffff' : '#374151'};
            ">
              ${message.content}
            </div>
          </div>
        `
      )
      .join('');

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
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
    if (this.unreadCount > 0) {
      this.unreadBadge.style.display = 'block';
      this.unreadBadge.textContent = this.unreadCount;
    } else {
      this.unreadBadge.style.display = 'none';
    }
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    this.chatWindow.style.display = this.isOpen ? 'flex' : 'none';
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateUnreadBadge();
      this.loadMessages();
      this.input.focus();
    }
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
