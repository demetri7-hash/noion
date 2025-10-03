/**
 * Owner Analytics - Business-Wide Metrics
 *
 * Calculates comprehensive analytics for restaurant owners:
 * - Complete business overview
 * - All employees performance
 * - Full revenue analytics
 * - Complete task/workflow stats
 * - System-wide gamification
 * - Trend analysis and forecasting
 */

import { Transaction, Insight } from '@/models';
import { Types } from 'mongoose';

export interface IOwnerAnalytics {
  restaurantId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Business Overview
  business: {
    totalRevenue: number;
    revenueChange: number; // % vs previous period
    totalTransactions: number;
    averageTicket: number;
    totalEmployees: number;
    activeEmployees: number;
  };

  // Revenue Analytics
  revenue: {
    daily: Array<{ date: Date; amount: number }>;
    byChannel: Array<{ channel: string; amount: number; count: number }>;
    byEmployee: Array<{ employeeId: string; name: string; amount: number }>;
    topItems: Array<{ item: string; count: number; revenue: number }>;
  };

  // Employee Performance
  employees: {
    totalCount: number;
    activeCount: number;
    averagePerformance: number;
    topPerformers: Array<{ id: string; name: string; score: number }>;
    needsAttention: Array<{ id: string; name: string; reason: string }>;
  };

  // Task & Workflow Stats
  operations: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    averageCompletionTime: number;
    overdueCount: number;
    activeWorkflows: number;
  };

  // Gamification Overview
  gamification: {
    totalPointsAwarded: number;
    averagePoints: number;
    badgesUnlocked: number;
    leaderboardTop5: Array<{ id: string; name: string; points: number }>;
  };

  // AI Insights Summary
  insights: {
    count: number;
    highPriority: number;
    revenueOpportunity: number;
    topInsights: Array<{ title: string; priority: string; opportunity: number }>;
  };

  // Trends & Forecasting
  trends: {
    revenueGrowth: number;
    performanceGrowth: number;
    customerGrowth: number;
    forecast30Day: number;
  };
}

/**
 * Calculate owner analytics (full business view)
 */
export async function calculateOwnerAnalytics(
  restaurantId: string,
  startDate: Date,
  endDate: Date
): Promise<IOwnerAnalytics> {

  // Fetch all transactions for period
  const transactions = await Transaction.find({
    restaurantId: new Types.ObjectId(restaurantId),
    transactionDate: { $gte: startDate, $lte: endDate }
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.totals?.total || 0), 0);
  const totalTransactions = transactions.length;
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate previous period for comparison
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodLength);
  const prevEnd = new Date(startDate);

  const prevTransactions = await Transaction.find({
    restaurantId: new Types.ObjectId(restaurantId),
    transactionDate: { $gte: prevStart, $lte: prevEnd }
  });

  const prevRevenue = prevTransactions.reduce((sum, t) => sum + (t.totals?.total || 0), 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Revenue by day
  const dailyRevenue = transactions.reduce((acc, t) => {
    const date = new Date(t.transactionDate).toDateString();
    if (!acc[date]) {
      acc[date] = { date: new Date(t.transactionDate), amount: 0 };
    }
    acc[date].amount += t.totals?.total || 0;
    return acc;
  }, {} as Record<string, { date: Date; amount: number }>);

  // Revenue by channel
  const byChannel = transactions.reduce((acc, t) => {
    const channel = t.orderType || 'dine-in';
    if (!acc[channel]) {
      acc[channel] = { channel, amount: 0, count: 0 };
    }
    acc[channel].amount += t.totals?.total || 0;
    acc[channel].count += 1;
    return acc;
  }, {} as Record<string, { channel: string; amount: number; count: number }>);

  // Revenue by employee
  const byEmployee = transactions.reduce((acc, t) => {
    const employeeId = t.employee?.id || 'unknown';
    const employeeName = t.employee?.name || 'Unknown';
    if (!acc[employeeId]) {
      acc[employeeId] = { employeeId, name: employeeName, amount: 0 };
    }
    acc[employeeId].amount += t.totals?.total || 0;
    return acc;
  }, {} as Record<string, { employeeId: string; name: string; amount: number }>);

  // Fetch AI insights
  const insights = await Insight.find({
    restaurantId: new Types.ObjectId(restaurantId),
    createdAt: { $gte: startDate, $lte: endDate }
  }).sort({ priority: 1, 'lostRevenue.total': -1 }).limit(5);

  const insightsCount = insights.length;
  const highPriorityCount = insights.filter(i => i.priority === 'high').length;
  const totalOpportunity = insights.reduce((sum, i) => sum + (i.lostRevenue?.total || 0), 0);

  // TODO: Employee stats when Employee collection exists
  const totalEmployees = 1; // At least the owner
  const activeEmployees = 1;

  // TODO: Task stats when Task model exists
  const totalTasks = 0;
  const completedTasks = 0;
  const overdueCount = 0;
  const activeWorkflows = 0;

  // TODO: Gamification stats
  const totalPointsAwarded = 0;
  const badgesUnlocked = 0;

  return {
    restaurantId,
    period: {
      start: startDate,
      end: endDate
    },
    business: {
      totalRevenue,
      revenueChange,
      totalTransactions,
      averageTicket,
      totalEmployees,
      activeEmployees
    },
    revenue: {
      daily: Object.values(dailyRevenue),
      byChannel: Object.values(byChannel),
      byEmployee: Object.values(byEmployee).sort((a, b) => b.amount - a.amount),
      topItems: [] // TODO: Implement when menu items are tracked
    },
    employees: {
      totalCount: totalEmployees,
      activeCount: activeEmployees,
      averagePerformance: 0,
      topPerformers: [],
      needsAttention: []
    },
    operations: {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      averageCompletionTime: 0,
      overdueCount,
      activeWorkflows
    },
    gamification: {
      totalPointsAwarded,
      averagePoints: totalEmployees > 0 ? totalPointsAwarded / totalEmployees : 0,
      badgesUnlocked,
      leaderboardTop5: []
    },
    insights: {
      count: insightsCount,
      highPriority: highPriorityCount,
      revenueOpportunity: totalOpportunity,
      topInsights: insights.map(i => ({
        title: i.title,
        priority: i.priority,
        opportunity: i.lostRevenue?.total || 0
      }))
    },
    trends: {
      revenueGrowth: revenueChange,
      performanceGrowth: 0,
      customerGrowth: 0,
      forecast30Day: totalRevenue * 1.1 // Simple 10% growth projection
    }
  };
}
