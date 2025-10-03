'use client';

/**
 * Chat Interface Component
 * Real-time chat with polling for updates
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, MoreVertical, Users, X, Search } from 'lucide-react';

interface Conversation {
  _id: string;
  type: 'direct' | 'group' | 'announcement';
  name?: string;
  participants: Array<{
    userId: string;
    name: string;
    role: string;
  }>;
  lastMessage?: {
    content: string;
    senderName: string;
    sentAt: string;
  };
  unreadCount?: number;
}

interface Message {
  _id: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  content: string;
  type: string;
  createdAt: string;
  readBy: Array<{ userId: string }>;
}

export default function ChatInterface({ token }: { token: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : '';

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Poll for new messages
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);

      // Poll every 3 seconds
      pollingInterval.current = setInterval(() => {
        loadMessages(activeConversation._id, true);
      }, 3000);

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [activeConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/v2/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, silent = false) => {
    try {
      const response = await fetch(
        `/api/v2/conversations/${conversationId}/messages?limit=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      if (!silent) {
        console.error('Error loading messages:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      const response = await fetch(
        `/api/v2/conversations/${activeConversation._id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newMessage,
            type: 'text'
          })
        }
      );

      if (response.ok) {
        setNewMessage('');
        await loadMessages(activeConversation._id);
        await loadConversations(); // Refresh to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group' || conv.type === 'announcement') {
      return conv.name || 'Group Chat';
    }
    const otherParticipant = conv.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.name || 'Unknown';
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setActiveConversation(conv)}
                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                  activeConversation?._id === conv._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {getConversationName(conv)}
                      </h3>
                      {conv.type === 'group' && (
                        <Users className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {conv.lastMessage.senderName}: {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount! > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getConversationName(activeConversation)}
              </h2>
              <p className="text-xs text-gray-500">
                {activeConversation.participants.length} participant{activeConversation.participants.length > 1 ? 's' : ''}
              </p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => {
              const isOwn = message.sender.id === currentUserId;

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <div className="text-xs text-gray-600 mb-1">
                        {message.sender.name}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-gray-600">
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={sending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  !newMessage.trim() || sending
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
