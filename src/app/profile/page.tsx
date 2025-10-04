'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useState, useEffect } from 'react';
import { Trophy, Award, TrendingUp, Flame } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
        loadStats(token);
        loadBadges(token);
      } catch (error) {
        console.error('Token decode error:', error);
      }
    }
  }, []);

  const loadStats = async (token: string) => {
    try {
      const response = await fetch('/api/v2/analytics/employee', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadBadges = async (token: string) => {
    try {
      const response = await fetch('/api/v2/badges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBadges(data.data?.unlocked || []);
      }
    } catch (error) {
      console.error('Failed to load badges:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
      case 'restaurant_owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'manager':
        return 'bg-green-100 text-green-700';
      case 'employee':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'restaurant_owner' ? 'Owner' : role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-4xl font-bold text-white">
                  {user?.email?.split('@')[0]?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.email?.split('@')[0] || 'User'}</h1>
            <p className="text-gray-600">{user?.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeColor(user?.role || '')}`}>
              {getRoleLabel(user?.role || '')}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalPoints || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.level || 1}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.currentStreak || 0} days</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Badges</p>
                <p className="text-2xl font-bold text-gray-900">{badges.length}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Badges</h2>
          </div>
          <div className="p-6">
            {badges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No badges earned yet</p>
                <p className="text-sm mt-1">Complete tasks to unlock badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((badge: any, idx: number) => (
                  <div key={idx} className="text-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <p className="font-medium text-gray-900 text-sm">{badge.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
