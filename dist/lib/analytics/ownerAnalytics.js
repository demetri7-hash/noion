"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOwnerAnalytics = calculateOwnerAnalytics;
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
/**
 * Calculate owner analytics (full business view)
 */
async function calculateOwnerAnalytics(restaurantId, startDate, endDate) {
    // Fetch all transactions for period
    const transactions = await models_1.Transaction.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        transactionDate: { $gte: startDate, $lte: endDate }
    }).lean();
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalTransactions = transactions.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodLength);
    const prevEnd = new Date(startDate);
    const prevTransactions = await models_1.Transaction.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        transactionDate: { $gte: prevStart, $lte: prevEnd }
    }).lean();
    const prevRevenue = prevTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    // Revenue by day
    const dailyRevenue = transactions.reduce((acc, t) => {
        const date = new Date(t.transactionDate).toDateString();
        if (!acc[date]) {
            acc[date] = { date: new Date(t.transactionDate), amount: 0 };
        }
        acc[date].amount += t.totalAmount || 0;
        return acc;
    }, {});
    // Revenue by channel
    const byChannel = transactions.reduce((acc, t) => {
        const channel = t.orderType || 'dine_in';
        if (!acc[channel]) {
            acc[channel] = { channel, amount: 0, count: 0 };
        }
        acc[channel].amount += t.totalAmount || 0;
        acc[channel].count += 1;
        return acc;
    }, {});
    // Revenue by employee
    const byEmployee = transactions.reduce((acc, t) => {
        const employeeId = t.employee?.id || 'unknown';
        const employeeName = t.employee?.name || 'Unknown';
        if (!acc[employeeId]) {
            acc[employeeId] = { employeeId, name: employeeName, amount: 0 };
        }
        acc[employeeId].amount += t.totalAmount || 0;
        return acc;
    }, {});
    // Fetch restaurant to get team data
    const restaurant = await models_1.Restaurant.findById(restaurantId);
    // Employee stats from Restaurant.team.employees
    const employees = restaurant?.team?.employees || [];
    const totalEmployees = employees.length + 1; // +1 for owner
    const activeEmployees = employees.filter((emp) => emp.isActive !== false).length + 1;
    // Gamification stats from employee data
    const totalPointsAwarded = employees.reduce((sum, emp) => sum + (emp.points || 0), 0) + (restaurant?.owner?.points || 0);
    const allBadges = employees.reduce((badges, emp) => [...badges, ...(emp.badges || [])], []);
    const badgesUnlocked = allBadges.length;
    // Fetch AI insights
    const insights = await models_1.Insight.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ priority: 1, 'lostRevenue.total': -1 }).limit(5);
    const insightsCount = insights.length;
    const highPriorityCount = insights.filter(i => i.priority === 'high').length;
    const totalOpportunity = insights.reduce((sum, i) => sum + (i.lostRevenue?.total || 0), 0);
    // Task stats from Task model
    const tasks = await models_1.Task.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        createdAt: { $gte: startDate, $lte: endDate }
    });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const now = new Date();
    const overdueCount = tasks.filter(t => t.status === 'pending' &&
        t.completedAt &&
        new Date(t.completedAt) < now).length;
    // Calculate average completion time
    const completedTasksWithTime = tasks.filter(t => t.status === 'completed' && t.completionTime);
    const avgCompletionTime = completedTasksWithTime.length > 0
        ? completedTasksWithTime.reduce((sum, t) => sum + (t.completionTime || 0), 0) / completedTasksWithTime.length
        : 0;
    // Active workflows - count unique workflowIds from active tasks
    const activeWorkflows = new Set(tasks.filter(t => t.status === 'pending').map(t => t.workflowId.toString())).size;
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
            byEmployee: Object.values(byEmployee)
                .filter(emp => emp.employeeId !== 'unknown' && emp.employeeId !== 'unassigned')
                .sort((a, b) => b.amount - a.amount),
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
            averageCompletionTime: Math.round(avgCompletionTime),
            overdueCount,
            activeWorkflows
        },
        gamification: {
            totalPointsAwarded,
            averagePoints: Math.round(totalEmployees > 0 ? totalPointsAwarded / totalEmployees : 0),
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
