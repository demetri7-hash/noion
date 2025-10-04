'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  CloudRain,
  Sun,
  Zap
} from 'lucide-react';

// Types for dashboard data
interface IDashboardMetrics {
  totalRevenue: {
    current: number;
    previous: number;
    change: number | null;
  };
  customerCount: {
    current: number;
    previous: number;
    change: number | null;
  };
  averageTicket: {
    current: number;
    previous: number;
    change: number | null;
  };
  peakHours: {
    start: string;
    end: string;
    revenue: number;
  };
}

interface IRevenueInsight {
  id: string;
  title: string;
  description: string;
  impact: number;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'viewed' | 'acted_upon';
}

interface ICorrelation {
  id: string;
  type: string;
  pattern: {
    description: string;
    whenCondition: string;
    thenOutcome: string;
    strength: string;
    actionable: boolean;
    recommendation?: string;
  };
  factor: any;
  outcome: {
    metric: string;
    value: number;
    change: number;
    baseline: number;
  };
  statistics: {
    correlation: number;
    confidence: number;
    pValue: number;
    sampleSize: number;
  };
  createdAt: string;
}

/**
 * Analytics Dashboard Component
 * Main dashboard showing revenue insights, key metrics, and actionable recommendations
 */
export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [insights, setInsights] = useState<IRevenueInsight[]>([]);
  const [correlations, setCorrelations] = useState<ICorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedInsight, setSelectedInsight] = useState<IRevenueInsight | null>(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    loadCorrelations();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data from API...');

      // Get restaurantId from localStorage (set during OAuth callback)
      const restaurantId = typeof window !== 'undefined'
        ? localStorage.getItem('restaurantId')
        : null;

      if (!restaurantId) {
        console.warn('No restaurant ID found - user needs to connect POS');
        setMetrics(null);
        setInsights([]);
        setLoading(false);
        return;
      }

      console.log('Fetching dashboard for restaurant:', restaurantId);

      // Fetch real data from API
      const response = await fetch(`/api/dashboard/${restaurantId}?timeRange=${timeRange}`);
      const result = await response.json();

      console.log('Dashboard API response:', result);

      if (result.success && result.data) {
        if (result.data.hasData) {
          setMetrics(result.data.metrics);
          setInsights(result.data.insights || []);
          console.log('✅ Dashboard loaded with real data:', {
            transactions: result.data.transactionCount,
            insights: result.data.insights?.length || 0
          });
        } else {
          setMetrics(null);
          setInsights([]);
          console.log('⏳ No transaction data yet - POS needs to sync');
        }
      } else {
        console.error('Dashboard API returned error:', result);
        setMetrics(null);
        setInsights([]);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setMetrics(null);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCorrelations = async () => {
    try {
      const restaurantId = typeof window !== 'undefined'
        ? localStorage.getItem('restaurantId')
        : null;

      if (!restaurantId) {
        return;
      }

      const response = await fetch(`/api/correlations?restaurantId=${restaurantId}`);
      const result = await response.json();

      if (result.success && result.data?.correlations) {
        setCorrelations(result.data.correlations);
        console.log(`✅ Loaded ${result.data.correlations.length} AI correlations`);
      }
    } catch (error) {
      console.error('Failed to load correlations:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getChangeIcon = (change: number | null) => {
    if (change === null) return null;
    return change >= 0 ? (
      <ChevronUp className="w-4 h-4 text-green-500" />
    ) : (
      <ChevronDown className="w-4 h-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number | null): string => {
    if (change === null) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time insights for your restaurant performance
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex space-x-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI-Discovered Insights */}
        {correlations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Zap className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">AI-Discovered Insights</h2>
              <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                {correlations.length} Pattern{correlations.length > 1 ? 's' : ''} Found
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {correlations.map((correlation) => (
                <div
                  key={correlation.id}
                  className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      {correlation.type.includes('WEATHER') ? (
                        <CloudRain className="w-8 h-8 text-purple-600 mr-3" />
                      ) : correlation.type.includes('HOLIDAY') ? (
                        <Sun className="w-8 h-8 text-purple-600 mr-3" />
                      ) : (
                        <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {correlation.pattern.description}
                        </h3>
                        <span className={`text-xs font-medium px-2 py-1 rounded mt-1 inline-block ${
                          correlation.pattern.strength === 'strong'
                            ? 'bg-green-100 text-green-700'
                            : correlation.pattern.strength === 'moderate'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {correlation.pattern.strength.toUpperCase()} CORRELATION
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pattern Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start">
                      <div className="bg-white rounded-lg px-3 py-2 flex-1">
                        <p className="text-sm text-gray-600 font-medium mb-1">When:</p>
                        <p className="text-gray-900">{correlation.pattern.whenCondition}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="bg-white rounded-lg px-3 py-2 flex-1">
                        <p className="text-sm text-gray-600 font-medium mb-1">Then:</p>
                        <p className="text-gray-900 font-semibold">{correlation.pattern.thenOutcome}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {correlation.pattern.recommendation && (
                    <div className="bg-purple-600 text-white rounded-lg px-4 py-3 mb-4">
                      <div className="flex items-start">
                        <Lightbulb className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium mb-1">💡 Recommended Action:</p>
                          <p className="text-sm">{correlation.pattern.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-600 mb-1">Correlation</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(correlation.statistics.correlation * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-600 mb-1">Confidence</p>
                      <p className="text-lg font-bold text-purple-600">
                        {correlation.statistics.confidence.toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-600 mb-1">Sample Size</p>
                      <p className="text-lg font-bold text-purple-600">
                        {correlation.statistics.sampleSize}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Syncing Notice */}
        {!metrics && insights.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mt-0.5 mr-3 flex-shrink-0"></div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">🚀 AI Analysis in Progress...</h3>
                <p className="text-sm text-blue-700 mb-2">
                  We&apos;re crunching your Toast POS data right now! Your dashboard will populate instantly once sync completes.
                </p>
                <p className="text-xs text-blue-600 font-medium mb-2">
                  💡 Refresh this page in a few moments to see your real-time insights
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.totalRevenue.current)}
                  </p>
                  <div className="flex items-center mt-1">
                    {metrics.totalRevenue.change !== null ? (
                      <>
                        {getChangeIcon(metrics.totalRevenue.change)}
                        <span className={`text-sm font-medium ${getChangeColor(metrics.totalRevenue.change)}`}>
                          {Math.abs(metrics.totalRevenue.change).toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last period</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Insufficient historical data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Count */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">Customers Served</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.customerCount.current.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    {metrics.customerCount.change !== null ? (
                      <>
                        {getChangeIcon(metrics.customerCount.change)}
                        <span className={`text-sm font-medium ${getChangeColor(metrics.customerCount.change)}`}>
                          {Math.abs(metrics.customerCount.change).toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last period</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Insufficient historical data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Average Ticket */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">Average Ticket</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.averageTicket.current)}
                  </p>
                  <div className="flex items-center mt-1">
                    {metrics.averageTicket.change !== null ? (
                      <>
                        {getChangeIcon(metrics.averageTicket.change)}
                        <span className={`text-sm font-medium ${getChangeColor(metrics.averageTicket.change)}`}>
                          {Math.abs(metrics.averageTicket.change).toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last period</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Insufficient historical data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">Peak Hours</p>
                  <p className="text-xl font-bold text-gray-900">
                    {metrics.peakHours.start} - {metrics.peakHours.end}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(metrics.peakHours.revenue)} revenue
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Insights Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Revenue Opportunities
              </h2>
              <span className="text-sm text-gray-500">
                {insights.filter(i => i.status === 'new').length} new insights
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {insights.map((insight) => (
                <div 
                  key={insight.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => setSelectedInsight(insight)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{insight.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </span>
                        {insight.status === 'new' && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">
                          {insight.category}
                        </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(insight.impact)}/month potential
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {insights.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-700 font-medium">🔄 Syncing your Toast POS data...</p>
                <p className="text-sm text-gray-500 mt-2">
                  AI-powered insights appear instantly once data sync completes
                </p>
                <p className="text-sm text-blue-600 font-medium mt-2">
                  💡 Try refreshing in a few moments
                </p>
                <div className="mt-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Generate Custom Report
            </button>
            <button className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center">
              <PieChart className="h-5 w-5 mr-2" />
              View Menu Performance
            </button>
            <button className="border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Users className="h-5 w-5 mr-2" />
              Staff Performance
            </button>
          </div>
        </div>
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedInsight.title}</h2>
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mb-4">{selectedInsight.description}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  Revenue Impact: {formatCurrency(selectedInsight.impact)}/month
                </p>
              </div>
              <div className="flex space-x-3">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Implement Recommendation
                </button>
                <button 
                  onClick={() => setSelectedInsight(null)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}