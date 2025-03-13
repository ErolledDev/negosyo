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

    const { data, error } = await this.supabase
      .from('widget_settings')
      .select(`
        *,
        quick_questions (
          id,
          question,
          question_order
        )
      `)
      .eq('id', this.widgetId)
      .single();

    if (error) {
      console.error('Error loading widget settings:', error);
      return;
    }

    this.widgetSettings = data;
    this.updateWidgetStyles();
  }

  createWidget() {
    // Create widget container
    this.container = document.createElement('div');
    this.container.id = 'business-chat-widget';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '20px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '9999';
    this.container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    // Create widget button
    this.button = document.createElement('button');
    this.button.style.width = '60px';
    this.button.style.height = '60px';
    this.button.style.borderRadius = '50%';
    this.button.style.border = 'none';
    this.button.style.cursor = 'pointer';
    this.button.style.display = 'flex';
    this.button.style.alignItems = 'center';
    this.button.style.justifyContent = 'center';
    this.button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    this.button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    this.button.onclick = () => this.toggleWidget();

    // Create chat window
    this.chatWindow = document.createElement('div');
    this.chatWindow.style.display = 'none';
    this.chatWindow.style.position = 'absolute';
    this.chatWindow.style.bottom = '80px';
    this.chatWindow.style.right = '0';
    this.chatWindow.style.width = '350px';
    this.chatWindow.style.height = '500px';
    this.chatWindow.style.backgroundColor = '#fff';
    this.chatWindow.style.borderRadius = '12px';
    this.chatWindow.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    this.chatWindow.style.overflow = 'hidden';
    this.chatWindow.style.display = 'none';
    this.chatWindow.style.flexDirection = 'column';

    // Create header
    this.header = document.createElement('div');
    this.header.style.padding = '16px';
    this.header.style.borderBottom = '1px solid #e5e7eb';
    this.header.style.display = 'flex';
    this.header.style.alignItems = 'center';
    this.header.style.gap = '8px';

    // Create messages container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.style.flex = '1';
    this.messagesContainer.style.overflowY = 'auto';
    this.messagesContainer.style.padding = '16px';

    // Create input container
    this.inputContainer = document.createElement('div');
    this.inputContainer.style.padding = '16px';
    this.inputContainer.style.borderTop = '1px solid #e5e7eb';
    this.inputContainer.style.display = 'flex';
    this.inputContainer.style.gap = '8px';
    this.inputContainer.style.backgroundColor = '#fff';
    this.inputContainer.style.position = 'relative';
    this.inputContainer.style.zIndex = '1';

    // Create message input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Type your message...';
    this.input.style.flex = '1';
    this.input.style.padding = '8px 12px';
    this.input.style.border = '1px solid #e5e7eb';
    this.input.style.borderRadius = '6px';
    this.input.style.outline = 'none';
    this.input.style.backgroundColor = '#fff';
    this.input.onkeypress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };

    // Create send button
    this.sendButton = document.createElement('button');
    this.sendButton.innerHTML = 'Send';
    this.sendButton.style.padding = '8px 16px';
    this.sendButton.style.border = 'none';
    this.sendButton.style.borderRadius = '6px';
    this.sendButton.style.cursor = 'pointer';
    this.sendButton.onclick = () => this.sendMessage();

    // Assemble the widget
    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(this.sendButton);
    this.chatWindow.appendChild(this.header);
    this.chatWindow.appendChild(this.messagesContainer);
    this.chatWindow.appendChild(this.inputContainer);
    this.container.appendChild(this.chatWindow);
    this.container.appendChild(this.button);
    document.body.appendChild(this.container);

    // Create unread badge
    this.unreadBadge = document.createElement('div');
    this.unreadBadge.style.position = 'absolute';
    this.unreadBadge.style.top = '-5px';
    this.unreadBadge.style.right = '-5px';
    this.unreadBadge.style.backgroundColor = '#ef4444';
    this.unreadBadge.style.color = 'white';
    this.unreadBadge.style.borderRadius = '9999px';
    this.unreadBadge.style.padding = '2px 6px';
    this.unreadBadge.style.fontSize = '12px';
    this.unreadBadge.style.fontWeight = 'bold';
    this.unreadBadge.style.display = 'none';
    this.button.style.position = 'relative';
    this.button.appendChild(this.unreadBadge);
  }

  updateWidgetStyles() {
    if (!this.widgetSettings) return;

    // Update colors
    this.button.style.backgroundColor = this.widgetSettings.primary_color;
    this.button.style.color = '#ffffff';
    this.sendButton.style.backgroundColor = this.widgetSettings.primary_color;
    this.sendButton.style.color = '#ffffff';

    // Update header with business name
    this.header.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${this.widgetSettings.primary_color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <div>
        <div style="font-weight: 600; color: ${this.widgetSettings.primary_color}">${this.widgetSettings.business_name}</div>
      </div>
    `;

    // Update welcome message and quick questions
    if (!this.conversationId) {
      const quickQuestions = this.widgetSettings.quick_questions || [];
      quickQuestions.sort((a, b) => a.question_order - b.question_order);

      this.messagesContainer.innerHTML = `
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #374151;">${this.widgetSettings.welcome_message}</p>
          ${quickQuestions
            .map(
              (q) => `
                <button
                  style="display: block; width: 100%; text-align: left; padding: 8px 12px; margin: 4px 0; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer; color: #374151; transition: all 0.2s;"
                  onmouseover="this.style.backgroundColor='${this.widgetSettings.primary_color}'; this.style.color='white';"
                  onmouseout="this.style.backgroundColor='#f3f4f6'; this.style.color='#374151';"
                  onclick="window.businessChat.sendQuickQuestion('${q.question}')"
                >
                  ${q.question}
                </button>
              `
            )
            .join('')}
        </div>
      `;
    }
  }

  async createConversation() {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        widget_id: this.widgetId,
        visitor_name: 'Visitor',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return;
    }

    this.conversationId = data.id;
    return data;
  }

  async sendMessage(content = this.input.value.trim()) {
    if (!content || !this.supabase) return;

    if (!this.conversationId) {
      await this.createConversation();
    }

    if (!this.conversationId) {
      console.error('Failed to create conversation');
      return;
    }

    const { error } = await this.supabase.from('messages').insert({
      conversation_id: this.conversationId,
      content,
      is_from_visitor: true,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    this.input.value = '';
  }

  sendQuickQuestion(question) {
    this.sendMessage(question);
  }

  async loadMessages() {
    if (!this.conversationId || !this.supabase) return;

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', this.conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    this.messages = data;
    this.renderMessages();
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