import React, { useEffect, useState, useRef } from 'react';
import { MoreVertical, Pin, User, Search, Trash, Archive } from 'lucide-react';
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
}

interface Message {
  id: string;
  content: string;
  is_from_visitor: boolean;
  created_at: string;
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

  useEffect(() => {
    if (session?.user) {
      loadConversations();
      subscribeToNewMessages();
    }
  }, [session]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    const { data: widgetData } = await supabase
      .from('widget_settings')
      .select('id')
      .eq('user_id', session?.user.id)
      .single();

    if (!widgetData) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          content,
          created_at,
          is_from_visitor,
          read
        )
      `)
      .eq('widget_id', widgetData.id)
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
    }));

    setConversations(conversationsWithMeta);
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data);
    scrollToBottom();
  };

  const subscribeToNewMessages = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        loadConversations();
        if (selectedConversation) {
          loadMessages(selectedConversation);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      content: newMessage,
      is_from_visitor: false,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
    loadMessages(selectedConversation);
    loadConversations();
  };

  const togglePin = async (conversationId: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('conversations')
      .update({ pinned: !currentPinned })
      .eq('id', conversationId);

    if (error) {
      console.error('Error toggling pin:', error);
      return;
    }

    loadConversations();
  };

  const markConversationAsRead = async (conversationId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('is_from_visitor', true);

    if (error) {
      console.error('Error marking conversation as read:', error);
      return;
    }

    loadConversations();
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
    loadConversations();
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

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedConversation === conversation.id ? 'bg-blue-50' : ''
              } ${conversation.pinned ? 'bg-blue-50/50' : ''}`}
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {conversation.visitor_name}
                    </span>
                    {conversation.pinned && (
                      <Pin className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-gray-500 truncate">
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
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
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
              {conversation.last_message && (
                <div className="mt-1 text-xs text-gray-400">
                  {formatTimestamp(conversation.last_message.created_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-gray-400" />
                <div>
                  <h3 className="font-medium">
                    {conversations.find((c) => c.id === selectedConversation)?.visitor_name}
                  </h3>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => deleteConversation(selectedConversation)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Archive className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.is_from_visitor ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                      message.is_from_visitor
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-75 mt-1 block">
                      {formatTimestamp(message.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-white">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;