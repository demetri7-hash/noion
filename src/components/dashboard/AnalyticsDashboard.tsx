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
  Activity
} from 'lucide-react';

// Types for dashboard data
interface IDashboardMetrics {
  totalRevenue: {
    current: number;
    previous: number;
    change: number;
  };
  customerCount: {
    current: number;
    previous: number;
    change: number;
  };
  averageTicket: {
    current: number;
    previous: number;
    change: number;
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

/**
 * Analytics Dashboard Component
 * Main dashboard showing revenue insights, key metrics, and actionable recommendations
 */
export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<IDashboardMetrics | null>(null);
  const [insights, setInsights] = useState<IRevenueInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedInsight, setSelectedInsight] = useState<IRevenueInsight | null>(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock data for development
      // In production, fetch from API
      const mockMetrics: IDashboardMetrics = {
        totalRevenue: {
          current: 47500,
          previous: 42300,
          change: 12.3
        },
        customerCount: {
          current: 1247,
          previous: 1156,
          change: 7.9
        },
        averageTicket: {
          current: 38.12,
          previous: 36.58,
          change: 4.2
        },
        peakHours: {
          start: '6:00 PM',
          end: '8:30 PM',
          revenue: 18750
        }
      };

      const mockInsights: IRevenueInsight[] = [
        {
          id: '1',
          title: 'Upselling Opportunity',
          description: 'Servers could increase revenue by $1,200/month with systematic upselling of appetizers during peak hours',
          impact: 1200,
          category: 'Sales Optimization',
          priority: 'high',
          status: 'new'
        },
        {
          id: '2',
          title: 'Menu Engineering',
          description: 'Repositioning high-margin items could boost profits by $800/month',
          impact: 800,
          category: 'Menu Strategy',
          priority: 'medium',
          status: 'new'
        },
        {
          id: '3',
          title: 'Staffing Optimization',
          description: 'Adding one server during Friday peak hours could serve 20% more customers',
          impact: 2100,
          category: 'Operations',
          priority: 'high',
          status: 'viewed'
        }
      ];

      setMetrics(mockMetrics);
      setInsights(mockInsights);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
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

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <ChevronUp className="w-4 h-4 text-green-500" />
    ) : (
      <ChevronDown className="w-4 h-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number): string => {
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
                    {getChangeIcon(metrics.totalRevenue.change)}
                    <span className={`text-sm font-medium ${getChangeColor(metrics.totalRevenue.change)}`}>
                      {Math.abs(metrics.totalRevenue.change).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
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
                    {getChangeIcon(metrics.customerCount.change)}
                    <span className={`text-sm font-medium ${getChangeColor(metrics.customerCount.change)}`}>
                      {Math.abs(metrics.customerCount.change).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
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
                    {getChangeIcon(metrics.averageTicket.change)}
                    <span className={`text-sm font-medium ${getChangeColor(metrics.averageTicket.change)}`}>
                      {Math.abs(metrics.averageTicket.change).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
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
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No insights available yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Connect your POS system to start getting AI-powered insights.
                </p>
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