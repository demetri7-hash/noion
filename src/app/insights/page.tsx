'use client';

/**
 * Insights List Page
 * Browse all AI-generated business insights
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

interface Insight {
  _id: string;
  type: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  createdAt: string;
  lostRevenue: {
    total: number;
  };
  keyFindings: any[];
  recommendations: any[];
}

interface InsightsStats {
  total: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byStatus: {
    generated: number;
    sent: number;
    viewed: number;
    acted_upon: number;
    dismissed: number;
  };
  totalRevenueOpportunity: number;
}

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<InsightsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    priority: '',
    status: '',
    type: ''
  });

  useEffect(() => {
    fetchInsights();
  }, [filter]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view insights');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.status) params.set('status', filter.status);
      if (filter.type) params.set('type', filter.type);

      const response = await fetch(`/api/insights?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.data.insights);
      setStats(data.data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated': return '📋';
      case 'sent': return '📧';
      case 'viewed': return '👁️';
      case 'acted_upon': return '✅';
      case 'dismissed': return '🗑️';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error loading insights</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6">
          <h1 className="text-3xl font-bold">AI Business Insights</h1>
          <p className="text-purple-100 mt-2">
            Pattern discovery and revenue optimization recommendations
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Insights</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="text-sm text-red-600">Critical Priority</div>
              <div className="text-3xl font-bold text-red-900">{stats.byPriority.critical}</div>
            </div>
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <div className="text-sm text-orange-600">High Priority</div>
              <div className="text-3xl font-bold text-orange-900">{stats.byPriority.high}</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="text-sm text-green-600">Revenue Opportunity</div>
              <div className="text-3xl font-bold text-green-900">
                ${stats.totalRevenueOpportunity.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="acted_upon">Acted Upon</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="weekly_summary">Weekly Summary</option>
                <option value="free_discovery">Free Discovery</option>
                <option value="monthly_analysis">Monthly Analysis</option>
              </select>
            </div>

            {(filter.priority || filter.status || filter.type) && (
              <div className="flex items-end">
                <button
                  onClick={() => setFilter({ priority: '', status: '', type: '' })}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600 text-lg">No insights found</p>
              <p className="text-gray-500 text-sm mt-2">
                Insights will appear here after your Toast sync completes and pattern discovery runs.
              </p>
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight._id}
                onClick={() => router.push(`/insights/${insight._id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getStatusIcon(insight.status)}</span>
                      <h3 className="text-xl font-semibold text-gray-900">{insight.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(insight.priority)}`}>
                        {insight.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{insight.summary}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div>
                        📊 <span className="font-medium">{insight.keyFindings.length}</span> findings
                      </div>
                      <div>
                        💡 <span className="font-medium">{insight.recommendations.length}</span> recommendations
                      </div>
                      <div>
                        💰 <span className="font-medium">${insight.lostRevenue?.total.toFixed(0)}</span> opportunity
                      </div>
                      <div>
                        📅 {new Date(insight.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
