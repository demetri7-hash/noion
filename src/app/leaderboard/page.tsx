'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { Award, Trophy, Medal } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600 mt-1">See how you rank among your teammates</p>
        </div>

        {/* Time Period Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
              Today
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              This Week
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              This Month
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              All Time
            </button>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="flex justify-center gap-4 mb-4">
            <Trophy className="h-12 w-12 text-yellow-500" />
            <Medal className="h-12 w-12 text-gray-400" />
            <Award className="h-12 w-12 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Leaderboard Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Compete with teammates, earn points and badges, track your ranking, and climb to the top. This feature is currently under development.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
