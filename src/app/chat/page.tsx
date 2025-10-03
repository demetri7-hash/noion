'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { MessageSquare, Send } from 'lucide-react';

export default function ChatPage() {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-12rem)]">
        <div className="bg-white rounded-lg shadow h-full flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
            <p className="text-sm text-gray-600 mt-1">Real-time messaging with your team</p>
          </div>

          {/* Coming Soon */}
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <MessageSquare className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Chat Coming Soon</h2>
              <p className="text-gray-600">
                Real-time chat, direct messages, group conversations, file sharing, and more. This feature is currently under development.
              </p>
            </div>
          </div>

          {/* Input (disabled for now) */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <button
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
