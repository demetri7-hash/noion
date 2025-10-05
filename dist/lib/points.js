"use strict";
/**
 * Points Calculation Engine
 * Handles all points calculations, bonuses, and multipliers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaskPoints = calculateTaskPoints;
exports.calculateWorkflowPoints = calculateWorkflowPoints;
exports.calculateLevel = calculateLevel;
exports.getPointsForNextLevel = getPointsForNextLevel;
exports.awardPoints = awardPoints;
exports.updateStreak = updateStreak;
const models_1 = require("../models");
const mongoose_1 = require("mongoose");
/**
 * Calculate points for task completion
 */
async function calculateTaskPoints(params) {
    const { task, completedAt, dueDate, hasPhoto, hasSignature, streak } = params;
    let basePoints = task.points || 10;
    const bonuses = {};
    let multiplier = 1.0;
    // On-time bonus
    if (dueDate && completedAt <= dueDate) {
        bonuses.onTime = 10;
    }
    // Early completion bonus (more than 1 hour early)
    if (dueDate) {
        const oneHourEarly = new Date(dueDate.getTime() - 60 * 60 * 1000);
        if (completedAt <= oneHourEarly) {
            bonuses.early = 5;
        }
    }
    // Photo bonus
    if (hasPhoto && task.requiresPhoto) {
        bonuses.photo = 5;
    }
    // Signature bonus
    if (hasSignature && task.requiresSignature) {
        bonuses.signature = 5;
    }
    // Streak multiplier
    if (streak) {
        if (streak >= 30) {
            multiplier = 1.5; // 50% bonus for 30+ day streak
        }
        else if (streak >= 14) {
            multiplier = 1.3; // 30% bonus for 14+ day streak
        }
        else if (streak >= 7) {
            multiplier = 1.2; // 20% bonus for 7+ day streak
        }
    }
    const bonusTotal = Object.values(bonuses).reduce((sum, val) => sum + val, 0);
    const total = Math.floor((basePoints + bonusTotal) * multiplier);
    return {
        basePoints,
        bonuses,
        multiplier,
        total,
        reason: buildReason(basePoints, bonuses, multiplier),
    };
}
/**
 * Calculate points for workflow completion
 */
async function calculateWorkflowPoints(params) {
    const { workflow, tasks, completedAt } = params;
    // Sum all task points
    const taskPoints = tasks.reduce((sum, task) => {
        if (task.status === 'completed') {
            return sum + (task.points || 10);
        }
        return sum;
    }, 0);
    const bonuses = {};
    let multiplier = 1.0;
    // Perfect workflow bonus (all tasks completed)
    const allCompleted = tasks.every((t) => t.status === 'completed');
    if (allCompleted) {
        bonuses.perfectWorkflow = 25;
    }
    // On-time workflow bonus
    if (workflow.dueDate && completedAt <= workflow.dueDate) {
        bonuses.onTime = 50;
    }
    const bonusTotal = Object.values(bonuses).reduce((sum, val) => sum + val, 0);
    const total = Math.floor((taskPoints + bonusTotal) * multiplier);
    return {
        basePoints: taskPoints,
        bonuses,
        multiplier,
        total,
        reason: buildReason(taskPoints, bonuses, multiplier),
    };
}
/**
 * Build human-readable reason for points
 */
function buildReason(base, bonuses, multiplier) {
    const parts = [`${base} base`];
    if (bonuses.perfectWorkflow)
        parts.push(`+${bonuses.perfectWorkflow} perfect`);
    if (bonuses.onTime)
        parts.push(`+${bonuses.onTime} on-time`);
    if (bonuses.early)
        parts.push(`+${bonuses.early} early`);
    if (bonuses.photo)
        parts.push(`+${bonuses.photo} photo`);
    if (bonuses.signature)
        parts.push(`+${bonuses.signature} signature`);
    if (bonuses.streak)
        parts.push(`+${bonuses.streak} streak`);
    if (multiplier > 1)
        parts.push(`×${multiplier} streak multiplier`);
    return parts.join(', ');
}
/**
 * Calculate level from total points
 */
function calculateLevel(points) {
    if (points < 100)
        return 1;
    if (points < 250)
        return 2;
    if (points < 500)
        return 3;
    if (points < 1000)
        return 4;
    if (points < 2000)
        return 5;
    if (points < 3500)
        return 6;
    if (points < 5500)
        return 7;
    if (points < 8000)
        return 8;
    if (points < 11000)
        return 9;
    return 10; // Max level
}
/**
 * Get points needed for next level
 */
function getPointsForNextLevel(currentLevel) {
    const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];
    return thresholds[currentLevel] || Infinity;
}
/**
 * Award points to user
 */
async function awardPoints(params) {
    const { userId, restaurantId, calculation, entityType, entityId } = params;
    // Update user's total points and streak
    const restaurant = await models_1.Restaurant.findOneAndUpdate({
        'owner.userId': userId,
        _id: restaurantId
    }, {
        $inc: { 'owner.points': calculation.total },
        $set: { 'owner.lastActivityDate': new Date() }
    }, { new: true });
    if (!restaurant) {
        throw new Error('User not found');
    }
    // Record in history
    await models_1.PointsHistory.create({
        userId: new mongoose_1.Types.ObjectId(userId),
        restaurantId: new mongoose_1.Types.ObjectId(restaurantId),
        points: calculation.total,
        reason: calculation.reason,
        breakdown: {
            basePoints: calculation.basePoints,
            bonuses: calculation.bonuses,
            multiplier: calculation.multiplier,
        },
        entityType,
        entityId: entityId ? new mongoose_1.Types.ObjectId(entityId) : undefined,
    });
    // Check for level up
    const newLevel = calculateLevel(restaurant.owner.points || 0);
    const currentLevel = restaurant.owner.level || 1;
    if (newLevel > currentLevel) {
        await models_1.Restaurant.findByIdAndUpdate(restaurantId, {
            $set: { 'owner.level': newLevel }
        });
        // TODO: Trigger level-up notification
    }
    return restaurant;
}
/**
 * Update user streak
 * Should be called daily to check if user maintained streak
 */
async function updateStreak(userId, restaurantId) {
    const restaurant = await models_1.Restaurant.findOne({
        'owner.userId': userId,
        _id: restaurantId
    });
    if (!restaurant) {
        throw new Error('User not found');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = restaurant.owner.lastActivityDate
        ? new Date(restaurant.owner.lastActivityDate)
        : null;
    if (lastActivity) {
        lastActivity.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 0) {
            // Activity today - maintain streak
            return restaurant.owner.streak || 0;
        }
        else if (daysDiff === 1) {
            // Activity yesterday - increment streak
            const newStreak = (restaurant.owner.streak || 0) + 1;
            await models_1.Restaurant.findByIdAndUpdate(restaurantId, {
                $set: { 'owner.streak': newStreak }
            });
            return newStreak;
        }
        else {
            // Streak broken - reset to 0
            await models_1.Restaurant.findByIdAndUpdate(restaurantId, {
                $set: { 'owner.streak': 0 }
            });
            return 0;
        }
    }
    return 0;
}
