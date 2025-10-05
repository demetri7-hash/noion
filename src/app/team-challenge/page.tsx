'use client';

import { Suspense, useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import WeeklyChallenge from '@/components/analytics/WeeklyChallenge';

function TeamChallengeContent() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('authToken') || '';
      setToken(authToken);
    }
  }, []);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Team Upsell Challenge</h1>
          <p className="text-gray-600 mt-2">
            Generate weekly challenges to motivate your team and boost revenue
          </p>
        </div>

        {token ? (
          <WeeklyChallenge token={token} />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Please log in to view team challenges</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function TeamChallengePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <TeamChallengeContent />
    </Suspense>
  );
}
