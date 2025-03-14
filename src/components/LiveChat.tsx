import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MoreVertical, Pin, User, Search, Trash, Archive, Send, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  visitor_name: string;
  pinned: boolean;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    is_from_visitor: boolean;
  };
  unread_count: number;
  status: 'online' | 'away' | 'offline';
}

interface Message {
  id: string;
  content: string;
  is_from_visitor: boolean;
  created_at: string;
  type: 'message' | 'welcome' | 'quick_question';
}

const LiveChat = () => {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const loadConversations = useCallback(async () => {
    if (!widgetId) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          content,
          created_at,
          is_from_visitor,
          read,
          type
        )
      `)
      .eq('widget_id', widgetId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    const conversationsWithMeta = data.map((conv) => ({
      ...conv,
      last_message: conv.messages[0],
      unread_count: conv.messages.filter((m: any) => !m.read && m.is_from_visitor).length,
      status: Math.random() > 0.5 ? 'online' : 'away', // Simulated online status
    }));

    setConversations(conversationsWithMeta);
    setLoading(false);
  }, [widgetId]);

  useEffect(() => {
    const loadWidgetSettings = async () => {
      if (!widgetId) return;

      const { data, error } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('id', widgetId)
        .single();

      if (error) {
        console.error('Error loading widget settings:', error);
        return;
      }

      setWidgetSettings(data);
    };

    if (widgetId) {
      loadWidgetSettings();
    }
  }, [widgetId]);

  useEffect(() => {
    const loadWidgetId = async () => {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('widget_settings')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading widget settings:', error);
        return;
      }

      if (data) {
        setWidgetId(data.id);
      }
    };

    loadWidgetId();
  }, [session]);

  useEffect(() => {
    if (widgetId) {
      loadConversations();
      subscribeToNewMessages();
    }
  }, [widgetId, loadConversations]);

  const loadMessages = async (conversationId: string) => {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
      return;
    }

    // Add welcome message at the beginning if it doesn't exist
    if (widgetSettings && messages.every((m: Message) => m.type !== 'welcome')) {
      const welcomeMessage = {
        id: 'welcome',
        content: widgetSettings.welcome_message,
        is_from_visitor: false,
        created_at: new Date().toISOString(),
        type: 'welcome'
      };
      setMessages([welcomeMessage, ...messages]);
    } else {
      setMessages(messages);
    }

    scrollToBottom();
  };

  const subscribeToNewMessages = () => {
    const conversationsChannel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `widget_id=eq.${widgetId}`,
      }, () => {
        loadConversations();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        if (payload.new.conversation_id === selectedConversation) {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
        loadConversations();
      })
      .subscribe();

    return () => {
      conversationsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  const simulateTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    simulateTyping();

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      content: newMessage,
      is_from_visitor: false,
      type: 'message'
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
  };

  const togglePin = async (conversationId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('conversations')
      .update({ pinned: !currentPinned })
      .eq('id', conversationId);

    if (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('is_from_visitor', true);

    if (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    setSelectedConversation(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.visitor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="w-80 border-r flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 hover:bg-white cursor-pointer transition-all duration-200 border-b border-gray-100 ${
                selectedConversation === conversation.id ? 'bg-white shadow-sm' : ''
              } ${conversation.pinned ? 'bg-blue-50/50' : ''}`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${getStatusColor(conversation.status)}`}></div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">
                        {conversation.visitor_name}
                      </span>
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(conversation.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conversation.last_message.content}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(conversation.id, conversation.pinned);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  {conversations.find((c) => c.id === selectedConversation)?.status && (
                    <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      getStatusColor(conversations.find((c) => c.id === selectedConversation)?.status || '')
                    }`}></div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {conversations.find((c) => c.id === selectedConversation)?.visitor_name}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center space-x-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      getStatusColor(conversations.find((c) => c.id === selectedConversation)?.status || '')
                    }`}></span>
                    <span>{conversations.find((c) => c.id === selectedConversation)?.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => deleteConversation(selectedConversation)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                >
                  <Archive className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${
                    message.is_from_visitor ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${
                      message.type === 'welcome'
                        ? 'bg-blue-50 text-blue-800 border border-blue-100'
                        : message.is_from_visitor
                        ? 'bg-white text-gray-900'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs opacity-75">
                        {formatTimestamp(message.created_at)}
                      </span>
                      {!message.is_from_visitor && (
                        <CheckCircle2 className="h-3 w-3 text-blue-200" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">No conversation selected</p>
              <p className="text-sm text-gray-500">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;