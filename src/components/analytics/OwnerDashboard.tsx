'use client';

/**
 * Owner Dashboard Component
 *
 * Displays comprehensive business metrics for owners:
 * - Business overview
 * - Revenue analytics (daily, by channel, by employee)
 * - Employee performance
 * - Operations stats
 * - AI insights summary
 * - Trends and forecasting
 */

import React, { useEffect, useState } from 'react';
import { IOwnerAnalytics } from '@/lib/analytics/ownerAnalytics';

interface OwnerDashboardProps {
  token: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function OwnerDashboard({ token, dateRange }: OwnerDashboardProps) {
  const [analytics, setAnalytics] = useState<IOwnerAnalytics | null>(null);
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

      const response = await fetch(`/api/v2/analytics/owner?${params}`, {
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
      console.error('Error fetching owner analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold">Business Dashboard</h1>
        <p className="text-purple-100 mt-1">
          {new Date(analytics.period.start).toLocaleDateString()} - {new Date(analytics.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Business Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Business Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Revenue"
            value={`$${analytics.business.totalRevenue.toFixed(2)}`}
            trend={analytics.business.revenueChange}
          />
          <StatCard
            label="Transactions"
            value={analytics.business.totalTransactions}
          />
          <StatCard
            label="Avg Ticket"
            value={`$${analytics.business.averageTicket.toFixed(2)}`}
          />
          <StatCard
            label="Total Employees"
            value={analytics.business.totalEmployees}
          />
          <StatCard
            label="Active Employees"
            value={analytics.business.activeEmployees}
          />
          <StatCard
            label="30-Day Forecast"
            value={`$${analytics.trends.forecast30Day.toFixed(0)}`}
          />
        </div>
      </div>

      {/* AI Insights Summary */}
      {analytics.insights.count > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{analytics.insights.count}</div>
              <div className="text-sm text-gray-600">Total Insights</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{analytics.insights.highPriority}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                ${analytics.insights.revenueOpportunity.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Revenue Opportunity</div>
            </div>
          </div>
          <div className="space-y-2">
            {analytics.insights.topInsights.map((insight, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{insight.title}</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                    insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {insight.priority}
                  </span>
                </div>
                <div className="text-sm font-semibold text-green-600">
                  ${insight.opportunity.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue by Channel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue by Channel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.revenue.byChannel.map((channel) => (
            <div key={channel.channel} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1 capitalize">{channel.channel}</div>
              <div className="text-xl font-bold text-gray-900">${channel.amount.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">{channel.count} orders</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Employees */}
      {analytics.revenue.byEmployee.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Performing Employees</h2>
          <div className="space-y-2">
            {analytics.revenue.byEmployee.slice(0, 5).map((emp, idx) => (
              <div key={emp.employeeId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 ${
                    idx === 0 ? 'bg-yellow-500' :
                    idx === 1 ? 'bg-gray-400' :
                    idx === 2 ? 'bg-orange-600' :
                    'bg-blue-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{emp.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">${emp.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operations Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Tasks"
            value={analytics.operations.totalTasks}
          />
          <StatCard
            label="Completed"
            value={analytics.operations.completedTasks}
          />
          <StatCard
            label="Completion Rate"
            value={`${analytics.operations.completionRate.toFixed(1)}%`}
          />
          <StatCard
            label="Avg Completion Time"
            value={`${analytics.operations.averageCompletionTime}m`}
          />
          <StatCard
            label="Overdue"
            value={analytics.operations.overdueCount}
            isWarning={analytics.operations.overdueCount > 0}
          />
          <StatCard
            label="Active Workflows"
            value={analytics.operations.activeWorkflows}
          />
        </div>
      </div>

      {/* Employee Performance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Employee Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Employees"
            value={analytics.employees.totalCount}
          />
          <StatCard
            label="Active Employees"
            value={analytics.employees.activeCount}
          />
          <StatCard
            label="Avg Performance"
            value={`${analytics.employees.averagePerformance.toFixed(1)}%`}
          />
          <StatCard
            label="Needs Attention"
            value={analytics.employees.needsAttention.length}
            isWarning={analytics.employees.needsAttention.length > 0}
          />
        </div>
      </div>

      {/* Gamification Overview */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Gamification Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{analytics.gamification.totalPointsAwarded}</div>
            <div className="text-sm text-yellow-100">Total Points Awarded</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{analytics.gamification.averagePoints.toFixed(0)}</div>
            <div className="text-sm text-yellow-100">Avg Points/Employee</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{analytics.gamification.badgesUnlocked}</div>
            <div className="text-sm text-yellow-100">Badges Unlocked 🏆</div>
          </div>
        </div>
      </div>
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
