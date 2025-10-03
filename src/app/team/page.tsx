'use client';

import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { Users, UserPlus, Search } from 'lucide-react';

export default function TeamPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Manage your team members and their roles</p>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <UserPlus className="h-5 w-5 mr-2" />
            Add Member
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Employee</option>
            </select>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Team Management Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            View and manage team members, assign roles, track performance, and more. This feature is currently under development.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
