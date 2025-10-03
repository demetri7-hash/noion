/**
 * Points Calculation Engine
 * Handles all points calculations, bonuses, and multipliers
 */

import { Restaurant, PointsHistory } from '@/models';
import { Types } from 'mongoose';

export interface PointsCalculation {
  basePoints: number;
  bonuses: {
    perfectWorkflow?: number;
    onTime?: number;
    early?: number;
    streak?: number;
    photo?: number;
    signature?: number;
  };
  multiplier: number;
  total: number;
  reason: string;
}

/**
 * Calculate points for task completion
 */
export async function calculateTaskPoints(params: {
  task: any;
  completedAt: Date;
  dueDate?: Date;
  hasPhoto?: boolean;
  hasSignature?: boolean;
  streak?: number;
}): Promise<PointsCalculation> {
  const { task, completedAt, dueDate, hasPhoto, hasSignature, streak } = params;

  let basePoints = task.points || 10;
  const bonuses: any = {};
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
    } else if (streak >= 14) {
      multiplier = 1.3; // 30% bonus for 14+ day streak
    } else if (streak >= 7) {
      multiplier = 1.2; // 20% bonus for 7+ day streak
    }
  }

  const bonusTotal = Object.values(bonuses).reduce((sum: number, val: any) => sum + val, 0);
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
export async function calculateWorkflowPoints(params: {
  workflow: any;
  tasks: any[];
  completedAt: Date;
}): Promise<PointsCalculation> {
  const { workflow, tasks, completedAt } = params;

  // Sum all task points
  const taskPoints = tasks.reduce((sum, task) => {
    if (task.status === 'completed') {
      return sum + (task.points || 10);
    }
    return sum;
  }, 0);

  const bonuses: any = {};
  let multiplier = 1.0;

  // Perfect workflow bonus (all tasks completed)
  const allCompleted = tasks.every((t: any) => t.status === 'completed');
  if (allCompleted) {
    bonuses.perfectWorkflow = 25;
  }

  // On-time workflow bonus
  if (workflow.dueDate && completedAt <= workflow.dueDate) {
    bonuses.onTime = 50;
  }

  const bonusTotal = Object.values(bonuses).reduce((sum: number, val: any) => sum + val, 0);
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
function buildReason(base: number, bonuses: any, multiplier: number): string {
  const parts = [`${base} base`];

  if (bonuses.perfectWorkflow) parts.push(`+${bonuses.perfectWorkflow} perfect`);
  if (bonuses.onTime) parts.push(`+${bonuses.onTime} on-time`);
  if (bonuses.early) parts.push(`+${bonuses.early} early`);
  if (bonuses.photo) parts.push(`+${bonuses.photo} photo`);
  if (bonuses.signature) parts.push(`+${bonuses.signature} signature`);
  if (bonuses.streak) parts.push(`+${bonuses.streak} streak`);

  if (multiplier > 1) parts.push(`×${multiplier} streak multiplier`);

  return parts.join(', ');
}

/**
 * Calculate level from total points
 */
export function calculateLevel(points: number): number {
  if (points < 100) return 1;
  if (points < 250) return 2;
  if (points < 500) return 3;
  if (points < 1000) return 4;
  if (points < 2000) return 5;
  if (points < 3500) return 6;
  if (points < 5500) return 7;
  if (points < 8000) return 8;
  if (points < 11000) return 9;
  return 10; // Max level
}

/**
 * Get points needed for next level
 */
export function getPointsForNextLevel(currentLevel: number): number {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];
  return thresholds[currentLevel] || Infinity;
}

/**
 * Award points to user
 */
export async function awardPoints(params: {
  userId: string;
  restaurantId: string;
  calculation: PointsCalculation;
  entityType?: 'task' | 'workflow' | 'manual';
  entityId?: string;
}): Promise<any> {
  const { userId, restaurantId, calculation, entityType, entityId } = params;

  // Update user's total points and streak
  const restaurant = await Restaurant.findOneAndUpdate(
    {
      'owner.userId': userId,
      _id: restaurantId
    },
    {
      $inc: { 'owner.points': calculation.total },
      $set: { 'owner.lastActivityDate': new Date() }
    },
    { new: true }
  );

  if (!restaurant) {
    throw new Error('User not found');
  }

  // Record in history
  await PointsHistory.create({
    userId: new Types.ObjectId(userId),
    restaurantId: new Types.ObjectId(restaurantId),
    points: calculation.total,
    reason: calculation.reason,
    breakdown: {
      basePoints: calculation.basePoints,
      bonuses: calculation.bonuses,
      multiplier: calculation.multiplier,
    },
    entityType,
    entityId: entityId ? new Types.ObjectId(entityId) : undefined,
  });

  // Check for level up
  const newLevel = calculateLevel(restaurant.owner.points);
  if (newLevel > restaurant.owner.level) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
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
export async function updateStreak(userId: string, restaurantId: string): Promise<number> {
  const restaurant = await Restaurant.findOne({
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
    } else if (daysDiff === 1) {
      // Activity yesterday - increment streak
      const newStreak = (restaurant.owner.streak || 0) + 1;
      await Restaurant.findByIdAndUpdate(restaurantId, {
        $set: { 'owner.streak': newStreak }
      });
      return newStreak;
    } else {
      // Streak broken - reset to 0
      await Restaurant.findByIdAndUpdate(restaurantId, {
        $set: { 'owner.streak': 0 }
      });
      return 0;
    }
  }

  return 0;
}
