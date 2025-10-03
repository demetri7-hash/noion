'use client';

/**
 * Manager Dashboard Component
 *
 * Displays team performance metrics for managers:
 * - Team overview
 * - Individual team member stats
 * - Team revenue contribution
 * - Task completion rates
 */

import React, { useEffect, useState } from 'react';
import { IManagerAnalytics, ITeamMemberStats } from '@/lib/analytics/managerAnalytics';

interface ManagerDashboardProps {
  token: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function ManagerDashboard({ token, dateRange }: ManagerDashboardProps) {
  const [analytics, setAnalytics] = useState<IManagerAnalytics | null>(null);
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

      const response = await fetch(`/api/v2/analytics/manager?${params}`, {
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
      console.error('Error fetching manager analytics:', err);
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
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold">Team Performance Dashboard</h1>
        <p className="text-green-100 mt-1">
          {new Date(analytics.period.start).toLocaleDateString()} - {new Date(analytics.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Team Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Team Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Team Members"
            value={analytics.team.totalMembers}
          />
          <StatCard
            label="Active Members"
            value={analytics.team.activeMembers}
          />
          <StatCard
            label="Avg Completion Rate"
            value={`${analytics.team.averageCompletionRate.toFixed(1)}%`}
          />
          <StatCard
            label="Avg On-Time Rate"
            value={`${analytics.team.averageOnTimeRate.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Task Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Tasks Assigned"
            value={analytics.performance.totalTasksAssigned}
          />
          <StatCard
            label="Tasks Completed"
            value={analytics.performance.totalTasksCompleted}
          />
          <StatCard
            label="Completion Rate"
            value={`${analytics.performance.completionRate.toFixed(1)}%`}
            trend={analytics.trends.performanceChange}
          />
          <StatCard
            label="Overdue Tasks"
            value={analytics.performance.overdueCount}
            isWarning={analytics.performance.overdueCount > 0}
          />
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Team Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* Team Members Table */}
      {analytics.teamMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Team Members</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.teamMembers.map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.performance.tasksCompleted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.performance.completionRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${member.revenue.totalSales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.gamification.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for stat cards
function StatCard({
  label,
  value,
  trend,
  isWarning,
}: {
  label: string;
  value: string | number;
  trend?: number;
  isWarning?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 ${isWarning ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className={`text-sm mb-1 ${isWarning ? 'text-red-600' : 'text-gray-600'}`}>{label}</div>
      <div className={`text-2xl font-bold ${isWarning ? 'text-red-900' : 'text-gray-900'}`}>{value}</div>
      {trend !== undefined && trend !== 0 && (
        <div className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}
