"use strict";
/**
 * Manager Analytics - Team Performance Metrics
 *
 * Calculates analytics visible to managers:
 * - Team performance overview
 * - Individual team member stats
 * - Task assignment and completion
 * - Team revenue contribution
 * - Team gamification rankings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateManagerAnalytics = calculateManagerAnalytics;
exports.getTeamMemberStats = getTeamMemberStats;
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
/**
 * Calculate manager analytics for team
 */
async function calculateManagerAnalytics(managerId, restaurantId, startDate, endDate) {
    // Fetch restaurant to get team members
    const Restaurant = require('../../models/Restaurant').default;
    const restaurant = await Restaurant.findById(restaurantId);
    const employees = restaurant?.team?.employees || [];
    // Fetch all transactions for the period
    const allTransactions = await models_1.Transaction.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        transactionDate: { $gte: startDate, $lte: endDate }
    }).lean();
    // Build team member stats
    const teamMembers = employees.map((emp) => {
        const toastEmployeeId = emp.toastEmployeeId;
        // Get transactions for this employee
        const empTransactions = allTransactions.filter(t => t.employee?.id === toastEmployeeId);
        const totalSales = empTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const transactionCount = empTransactions.length;
        return {
            userId: emp._id?.toString() || emp.id?.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email || '',
            role: emp.role || 'employee',
            performance: {
                tasksCompleted: 0, // TODO: Implement when Task model is integrated
                completionRate: 0,
                onTimeRate: 0
            },
            revenue: {
                totalSales,
                transactionCount,
                averageTicket: transactionCount > 0 ? totalSales / transactionCount : 0
            },
            gamification: {
                points: emp.points || 0,
                level: emp.level || 1,
                rank: 0 // TODO: Calculate rank based on points
            }
        };
    });
    const totalMembers = teamMembers.length;
    const activeMembers = teamMembers.filter(m => m.revenue.transactionCount > 0).length;
    // TODO: Calculate task stats when Task model exists
    const totalTasksAssigned = 0;
    const totalTasksCompleted = 0;
    const overdueCount = 0;
    // Calculate team revenue from all transactions
    const totalSales = allTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const transactionCount = allTransactions.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;
    // Calculate team averages
    const averageCompletionRate = teamMembers.length > 0
        ? teamMembers.reduce((sum, m) => sum + m.performance.completionRate, 0) / teamMembers.length
        : 0;
    const averageOnTimeRate = teamMembers.length > 0
        ? teamMembers.reduce((sum, m) => sum + m.performance.onTimeRate, 0) / teamMembers.length
        : 0;
    // Find top performer by revenue
    const topPerformer = teamMembers.length > 0
        ? teamMembers.sort((a, b) => b.revenue.totalSales - a.revenue.totalSales)[0]?.userId
        : null;
    // TODO: Calculate trends
    const performanceChange = 0;
    const revenueChange = 0;
    return {
        managerId,
        restaurantId,
        period: {
            start: startDate,
            end: endDate
        },
        team: {
            totalMembers,
            activeMembers,
            averageCompletionRate,
            averageOnTimeRate
        },
        performance: {
            totalTasksAssigned,
            totalTasksCompleted,
            completionRate: totalTasksAssigned > 0 ? (totalTasksCompleted / totalTasksAssigned) * 100 : 0,
            onTimeRate: totalTasksCompleted > 0 ? averageOnTimeRate : 0,
            overdueCount
        },
        revenue: {
            totalSales,
            transactionCount,
            averageTicket,
            topPerformer
        },
        teamMembers,
        trends: {
            performanceChange,
            revenueChange
        }
    };
}
/**
 * Get team member details
 */
async function getTeamMemberStats(userId, restaurantId, startDate, endDate) {
    // TODO: Implement when Employee collection exists
    const transactions = await models_1.Transaction.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        'employee.id': userId,
        transactionDate: { $gte: startDate, $lte: endDate }
    }).lean();
    const totalSales = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const transactionCount = transactions.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;
    return {
        userId,
        name: 'Employee Name', // TODO: Get from Employee model
        email: 'employee@example.com', // TODO: Get from Employee model
        role: 'employee',
        performance: {
            tasksCompleted: 0,
            completionRate: 0,
            onTimeRate: 0
        },
        revenue: {
            totalSales,
            transactionCount,
            averageTicket
        },
        gamification: {
            points: 0,
            level: 1,
            rank: 0
        }
    };
}
