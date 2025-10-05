'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  Zap,
  Trophy,
  Target,
  Activity,
  ArrowUp,
  ArrowDown,
  Lightbulb,
  CloudRain,
  Sun
} from 'lucide-react';

interface TodayMetrics {
  revenue: {
    current: number;
    yesterday: number;
    change: number;
  };
  transactions: {
    current: number;
    yesterday: number;
    change: number;
  };
  avgTicket: {
    current: number;
    yesterday: number;
    change: number;
  };
  peakHour: {
    hour: string;
    revenue: number;
  };
}

interface StaffMember {
  id: string;
  name: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  hoursWorked: number;
}

interface AIRecommendation {
  id: string;
  type: 'weather' | 'staffing' | 'inventory' | 'peak_hour';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

/**
 * Owner War Room Dashboard
 * Real-time command center for restaurant owners
 */
export default function OwnerWarRoom() {
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null);
  const [topStaff, setTopStaff] = useState<StaffMember[]>([]);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarRoomData();
  }, []);

  const loadWarRoomData = async () => {
    try {
      setLoading(true);
      const restaurantId = localStorage.getItem('restaurantId');

      if (!restaurantId) {
        setLoading(false);
        return;
      }

      // Load today's metrics
      const metricsResponse = await fetch(`/api/dashboard/today/${restaurantId}`);
      const metricsData = await metricsResponse.json();

      if (metricsData.success) {
        setTodayMetrics(metricsData.data.metrics);
        setTopStaff(metricsData.data.topStaff || []);
      }

      // Load AI recommendations from correlations
      const correlationsResponse = await fetch(`/api/correlations?restaurantId=${restaurantId}`);
      const correlationsData = await correlationsResponse.json();

      if (correlationsData.success && correlationsData.data?.correlations) {
        // Convert correlations to actionable recommendations
        const recommendations = correlationsData.data.correlations
          .filter((c: any) => c.pattern.actionable && c.pattern.recommendation)
          .map((c: any) => ({
            id: c.id,
            type: c.type.includes('weather') ? 'weather' :
                  c.type.includes('staff') ? 'staffing' : 'peak_hour',
            title: c.pattern.description,
            description: c.pattern.recommendation,
            priority: c.statistics.confidence > 70 ? 'high' :
                     c.statistics.confidence > 40 ? 'medium' : 'low',
            actionable: true
          }));
        setAIRecommendations(recommendations);
      }

    } catch (error) {
      console.error('Failed to load war room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading War Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Daily War Room
        </h1>
        <p className="text-gray-600">
          Real-time command center • {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Today's Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Today's Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {todayMetrics ? formatCurrency(todayMetrics.revenue.current) : '$0'}
            </span>
          </div>
          {todayMetrics && todayMetrics.revenue.change !== 0 && (
            <div className={`flex items-center mt-2 text-sm ${
              todayMetrics.revenue.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {todayMetrics.revenue.change > 0 ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              <span>{formatChange(todayMetrics.revenue.change)} vs yesterday</span>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Transactions</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {todayMetrics?.transactions.current || 0}
            </span>
          </div>
          {todayMetrics && todayMetrics.transactions.change !== 0 && (
            <div className={`flex items-center mt-2 text-sm ${
              todayMetrics.transactions.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {todayMetrics.transactions.change > 0 ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              <span>{formatChange(todayMetrics.transactions.change)} vs yesterday</span>
            </div>
          )}
        </div>

        {/* Average Ticket */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Ticket</span>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {todayMetrics ? formatCurrency(todayMetrics.avgTicket.current) : '$0'}
            </span>
          </div>
          {todayMetrics && todayMetrics.avgTicket.change !== 0 && (
            <div className={`flex items-center mt-2 text-sm ${
              todayMetrics.avgTicket.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {todayMetrics.avgTicket.change > 0 ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              <span>{formatChange(todayMetrics.avgTicket.change)} vs yesterday</span>
            </div>
          )}
        </div>

        {/* Peak Hour */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Peak Hour Today</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {todayMetrics?.peakHour.hour || '--'}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {todayMetrics ? formatCurrency(todayMetrics.peakHour.revenue) : '$0'} revenue
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
          <div className="flex items-center mb-4">
            <Zap className="w-6 h-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">AI Recommendations</h2>
          </div>

          {aiRecommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recommendations available yet</p>
              <p className="text-sm mt-1">Check back as more data is analyzed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiRecommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-lg p-4 border-l-4 border-purple-500"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {rec.type === 'weather' && <CloudRain className="w-5 h-5 text-blue-600 mr-2" />}
                      {rec.type === 'staffing' && <Users className="w-5 h-5 text-green-600 mr-2" />}
                      {rec.type === 'peak_hour' && <Clock className="w-5 h-5 text-orange-600 mr-2" />}
                      <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 flex items-start">
                    <Lightbulb className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-purple-600" />
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Trophy className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Top Performers Today</h2>
          </div>

          {topStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No staff data available yet</p>
              <p className="text-sm mt-1">Data will appear as transactions are recorded</p>
            </div>
          ) : (
            <>
              {topStaff.every(s => s.hoursWorked === 0) && (
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Labor hours unavailable. Enable Toast Labor module for hours tracking.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {topStaff.slice(0, 5).map((staff, index) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-3 ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-500">
                        {staff.transactions} transactions
                        {staff.hoursWorked > 0 && ` • ${staff.hoursWorked}h worked`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrency(staff.sales)}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(staff.avgTicket)} avg</div>
                  </div>
                </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center text-blue-800">
          <Activity className="w-5 h-5 mr-2" />
          <span className="font-medium">Quick Actions:</span>
          <button className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            View Full Analytics
          </button>
          <button className="ml-2 px-3 py-1 bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm">
            Manage Staff
          </button>
          <button className="ml-2 px-3 py-1 bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm">
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
