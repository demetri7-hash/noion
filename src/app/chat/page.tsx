'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import ChatInterface from '../../components/chat/ChatInterface';

export default function ChatPage() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  if (!token) {
    return (
      <MainLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold">Authentication Required</p>
          <p className="text-yellow-600 text-sm mt-1">Please log in to access chat.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-12rem)]">
        <ChatInterface token={token} />
      </div>
    </MainLayout>
  );
}
