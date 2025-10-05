'use client';

/**
 * Employee Dashboard Component
 *
 * Displays personal performance metrics for employees:
 * - Task completion stats
 * - Revenue contribution
 * - Gamification progress (points, level, badges)
 * - Performance trends
 */

import React, { useEffect, useState } from 'react';
import { IEmployeeAnalytics } from '@/lib/analytics/employeeAnalytics';

interface EmployeeDashboardProps {
  token: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function EmployeeDashboard({ token, dateRange }: EmployeeDashboardProps) {
  const [analytics, setAnalytics] = useState<IEmployeeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.startDate) {
        params.set('startDate', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        params.set('endDate', dateRange.endDate.toISOString());
      }

      const response = await fetch(`/api/v2/analytics/employee?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching employee analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">Error loading analytics</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold">My Performance Dashboard</h1>
        <p className="text-blue-100 mt-1">
          {new Date(analytics.period.start).toLocaleDateString()} - {new Date(analytics.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Performance Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Task Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Tasks Completed"
            value={analytics.performance.tasksCompleted}
            trend={analytics.trends.performanceChange}
          />
          <StatCard
            label="Completion Rate"
            value={`${analytics.performance.completionRate.toFixed(1)}%`}
          />
          <StatCard
            label="On-Time Rate"
            value={`${analytics.performance.onTimeRate.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Revenue Contribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Contribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Sales"
            value={`$${analytics.revenue.totalSales.toFixed(2)}`}
            trend={analytics.trends.revenueChange}
          />
          <StatCard
            label="Transactions"
            value={analytics.revenue.transactionCount}
          />
          <StatCard
            label="Average Ticket"
            value={`$${analytics.revenue.averageTicket.toFixed(2)}`}
          />
          <StatCard
            label="Tip %"
            value={`${analytics.revenue.tipPercentage.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Gamification */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{analytics.gamification.points}</div>
            <div className="text-sm text-yellow-100">Total Points</div>
            {analytics.gamification.pointsEarned > 0 && (
              <div className="text-xs text-yellow-200 mt-1">
                +{analytics.gamification.pointsEarned} this period
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">Level {analytics.gamification.level}</div>
            <div className="text-sm text-yellow-100">Current Level</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{analytics.gamification.streak}</div>
            <div className="text-sm text-yellow-100">Day Streak 🔥</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{analytics.gamification.badges}</div>
            <div className="text-sm text-yellow-100">Badges Earned 🏆</div>
          </div>
        </div>
        {analytics.gamification.rank > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-yellow-100">
              You&apos;re ranked #{analytics.gamification.rank} on the leaderboard!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for stat cards
function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend !== undefined && trend !== 0 && (
        <div className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}
