'use client';

/**
 * Manager Dashboard Page
 * Role-based analytics dashboard for managers
 */

import React, { Suspense, useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import ManagerDashboard from '../../../components/analytics/ManagerDashboard';

function ManagerDashboardContent() {
  const [token, setToken] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });

  useEffect(() => {
    // Get JWT token from localStorage
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    setToken(storedToken);
  }, []);

  if (!token) {
    return (
      <MainLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold">Authentication Required</p>
          <p className="text-yellow-600 text-sm mt-1">Please log in to view your dashboard.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  startDate: new Date(e.target.value)
                }))}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  endDate: new Date(e.target.value)
                }))}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <button
              onClick={() => setDateRange({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
              })}
              className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange({
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
              })}
              className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {/* Dashboard */}
        <ManagerDashboard token={token} dateRange={dateRange} />
      </div>
    </MainLayout>
  );
}

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <ManagerDashboardContent />
    </Suspense>
  );
}
