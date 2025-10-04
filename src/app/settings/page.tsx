'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useState, useEffect } from 'react';
import { Bell, Lock, User, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (error) {
        console.error('Token decode error:', error);
      }
    }
  }, []);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 capitalize"
              />
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-gray-400 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Task Reminders</p>
                <p className="text-sm text-gray-500">Get notified about upcoming tasks</p>
              </div>
              <input type="checkbox" className="h-5 w-5 text-blue-600 rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Badge Unlocks</p>
                <p className="text-sm text-gray-500">Notifications when you earn new badges</p>
              </div>
              <input type="checkbox" className="h-5 w-5 text-blue-600 rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Team Messages</p>
                <p className="text-sm text-gray-500">New messages in team chat</p>
              </div>
              <input type="checkbox" className="h-5 w-5 text-blue-600 rounded" defaultChecked />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Lock className="h-5 w-5 text-gray-400 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>
          </div>
          <div className="p-6">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Change Password
            </button>
            <p className="text-sm text-gray-500 mt-2">Update your password to keep your account secure</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
