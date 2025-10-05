"use strict";
/**
 * Employee Analytics - Personal Performance Metrics
 *
 * Calculates analytics visible to individual employees:
 * - Personal performance stats
 * - Own task completion rates
 * - Personal points/badges/streak
 * - Own revenue contribution
 * - Personal growth trends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEmployeeAnalytics = calculateEmployeeAnalytics;
exports.getEmployeeRank = getEmployeeRank;
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
/**
 * Calculate employee analytics for given period
 */
async function calculateEmployeeAnalytics(userId, restaurantId, startDate, endDate) {
    // TODO: When Task model is added, fetch task completion data
    const tasksCompleted = 0;
    const tasksOnTime = 0;
    const tasksLate = 0;
    // Fetch revenue data from transactions
    const transactions = await models_1.Transaction.find({
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        'employee.id': userId,
        transactionDate: { $gte: startDate, $lte: endDate }
    }).lean();
    const totalSales = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const transactionCount = transactions.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;
    // Calculate tip percentage
    const totalTips = transactions.reduce((sum, t) => sum + (t.tip || 0), 0);
    const tipPercentage = totalSales > 0 ? (totalTips / totalSales) * 100 : 0;
    // TODO: Calculate upsell success when menu items are tracked
    const upsellSuccess = 0;
    // TODO: Fetch gamification stats from user record
    const points = 0;
    const pointsEarned = 0;
    const level = 1;
    const streak = 0;
    const badges = 0;
    const rank = 0;
    // TODO: Calculate trends when historical data is available
    const performanceChange = 0;
    const revenueChange = 0;
    const pointsChange = 0;
    return {
        userId,
        restaurantId,
        period: {
            start: startDate,
            end: endDate
        },
        performance: {
            tasksCompleted,
            tasksOnTime,
            tasksLate,
            completionRate: tasksCompleted > 0 ? (tasksCompleted / (tasksCompleted + tasksLate)) * 100 : 0,
            onTimeRate: tasksCompleted > 0 ? (tasksOnTime / tasksCompleted) * 100 : 0,
            averageCompletionTime: 0 // TODO: Calculate from task completion times
        },
        revenue: {
            totalSales,
            transactionCount,
            averageTicket,
            upsellSuccess,
            tipPercentage
        },
        gamification: {
            points,
            pointsEarned,
            level,
            streak,
            badges,
            rank
        },
        trends: {
            performanceChange,
            revenueChange,
            pointsChange
        }
    };
}
/**
 * Get employee leaderboard position
 */
async function getEmployeeRank(userId, restaurantId) {
    // TODO: Implement when points tracking is active
    return 0;
}
