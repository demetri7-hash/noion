/**
 * Badge Checking System
 * Automatically checks and awards badges when criteria are met
 */

import { Badge, UserBadge, Restaurant, Task, Workflow } from '@/models';
import { Types } from 'mongoose';

export interface BadgeUnlock {
  badge: any;
  contextData: any;
}

/**
 * Check if user earned any new badges
 * Call this after major actions (task complete, workflow complete, etc.)
 */
export async function checkBadges(userId: string, restaurantId: string): Promise<BadgeUnlock[]> {
  const badges = await Badge.find({ isActive: true }).lean();
  const newBadges: BadgeUnlock[] = [];

  for (const badge of badges) {
    // Skip if already unlocked
    const existing = await UserBadge.findOne({
      userId: new Types.ObjectId(userId),
      badgeId: badge._id
    });
    if (existing) continue;

    // Check criteria
    const unlocked = await checkBadgeCriteria(userId, restaurantId, badge);

    if (unlocked) {
      // Award badge
      await UserBadge.create({
        userId: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        badgeId: badge._id,
        contextData: unlocked.contextData,
      });

      // Award bonus points if any
      if (badge.pointsBonus > 0) {
        await Restaurant.findOneAndUpdate(
          { _id: restaurantId, 'owner.userId': userId },
          { $inc: { 'owner.points': badge.pointsBonus } }
        );
      }

      newBadges.push({
        badge,
        contextData: unlocked.contextData,
      });
    }
  }

  return newBadges;
}

/**
 * Check if badge criteria is met
 */
async function checkBadgeCriteria(
  userId: string,
  restaurantId: string,
  badge: any
): Promise<{ contextData: any } | null> {
  const { criteria } = badge;

  switch (criteria.type) {
    case 'tasks_completed':
      const taskCount = await Task.countDocuments({
        assignedTo: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        status: 'completed',
      });
      if (taskCount >= criteria.threshold) {
        return { contextData: { taskCount } };
      }
      break;

    case 'workflows_completed':
      const workflowCount = await Workflow.countDocuments({
        assignedTo: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        status: 'completed',
      });
      if (workflowCount >= criteria.threshold) {
        return { contextData: { workflowCount } };
      }
      break;

    case 'streak':
      const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        'owner.userId': userId,
      });
      if (restaurant && (restaurant.owner.streak || 0) >= criteria.threshold) {
        return { contextData: { streak: restaurant.owner.streak } };
      }
      break;

    case 'points':
      const userPoints = await Restaurant.findOne({
        _id: restaurantId,
        'owner.userId': userId,
      });
      if (userPoints && (userPoints.owner.points || 0) >= criteria.threshold) {
        return { contextData: { points: userPoints.owner.points } };
      }
      break;

    case 'photo_tasks':
      const photoTasks = await Task.countDocuments({
        assignedTo: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        status: 'completed',
        requiresPhoto: true,
        photoUrl: { $exists: true, $ne: null },
      });
      if (photoTasks >= criteria.threshold) {
        return { contextData: { photoTasks } };
      }
      break;

    case 'signature_tasks':
      const signatureTasks = await Task.countDocuments({
        assignedTo: new Types.ObjectId(userId),
        restaurantId: new Types.ObjectId(restaurantId),
        status: 'completed',
        requiresSignature: true,
        signatureUrl: { $exists: true, $ne: null },
      });
      if (signatureTasks >= criteria.threshold) {
        return { contextData: { signatureTasks } };
      }
      break;

    case 'custom':
      // Custom badge logic
      return await checkCustomBadge(userId, restaurantId, badge);
  }

  return null;
}

/**
 * Custom badge checks for special badges
 */
async function checkCustomBadge(
  userId: string,
  restaurantId: string,
  badge: any
): Promise<{ contextData: any } | null> {
  // Perfect Week badge - 100% completion for 7 days
  if (badge.name === 'Perfect Week' || badge.criteria.customCheck === 'perfect_week') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const tasks = await Task.find({
      assignedTo: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
      createdAt: { $gte: sevenDaysAgo },
    });

    if (tasks.length === 0) return null;

    const completed = tasks.filter((t) => t.status === 'completed').length;
    const total = tasks.length;

    if (completed === total) {
      return { contextData: { completionRate: 100, taskCount: total } };
    }
  }

  // Speed Demon badge - Complete workflow in under target time
  if (badge.name === 'Speed Demon' || badge.criteria.customCheck === 'speed_demon') {
    const fastWorkflow = await Workflow.findOne({
      assignedTo: new Types.ObjectId(userId),
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'completed',
      completedAt: { $exists: true },
    }).sort({ completedAt: -1 });

    if (fastWorkflow && fastWorkflow.startedAt && fastWorkflow.completedAt) {
      const completionTime =
        (fastWorkflow.completedAt.getTime() - fastWorkflow.startedAt.getTime()) / (1000 * 60);
      // If completed in less than 30 minutes (example threshold)
      if (completionTime < 30) {
        return { contextData: { completionTime: Math.round(completionTime) } };
      }
    }
  }

  // Early Adopter badge - First 10 users
  if (badge.name === 'Early Adopter' || badge.criteria.customCheck === 'early_adopter') {
    const userCount = await Restaurant.countDocuments({
      _id: restaurantId,
    });
    if (userCount <= 10) {
      return { contextData: { userNumber: userCount } };
    }
  }

  return null;
}

/**
 * Get user's badges with details
 */
export async function getUserBadges(userId: string): Promise<any[]> {
  const userBadges = await UserBadge.find({
    userId: new Types.ObjectId(userId)
  })
    .populate('badgeId')
    .sort({ unlockedAt: -1 })
    .lean();

  return userBadges.map((ub: any) => ({
    ...ub.badgeId,
    unlockedAt: ub.unlockedAt,
    contextData: ub.contextData,
  }));
}

/**
 * Get badge progress for a user (how close to unlocking)
 */
export async function getBadgeProgress(userId: string, restaurantId: string): Promise<any[]> {
  const badges = await Badge.find({ isActive: true }).lean();
  const progress = [];

  for (const badge of badges) {
    // Skip if already unlocked
    const existing = await UserBadge.findOne({
      userId: new Types.ObjectId(userId),
      badgeId: badge._id
    });
    if (existing) continue;

    let current = 0;
    const threshold = badge.criteria.threshold || 0;

    switch (badge.criteria.type) {
      case 'tasks_completed':
        current = await Task.countDocuments({
          assignedTo: new Types.ObjectId(userId),
          restaurantId: new Types.ObjectId(restaurantId),
          status: 'completed',
        });
        break;

      case 'workflows_completed':
        current = await Workflow.countDocuments({
          assignedTo: new Types.ObjectId(userId),
          restaurantId: new Types.ObjectId(restaurantId),
          status: 'completed',
        });
        break;

      case 'streak':
        const restaurant = await Restaurant.findOne({
          _id: restaurantId,
          'owner.userId': userId,
        });
        current = restaurant?.owner.streak || 0;
        break;

      case 'points':
        const userPoints = await Restaurant.findOne({
          _id: restaurantId,
          'owner.userId': userId,
        });
        current = userPoints?.owner.points || 0;
        break;

      case 'photo_tasks':
        current = await Task.countDocuments({
          assignedTo: new Types.ObjectId(userId),
          restaurantId: new Types.ObjectId(restaurantId),
          status: 'completed',
          requiresPhoto: true,
          photoUrl: { $exists: true, $ne: null },
        });
        break;

      case 'signature_tasks':
        current = await Task.countDocuments({
          assignedTo: new Types.ObjectId(userId),
          restaurantId: new Types.ObjectId(restaurantId),
          status: 'completed',
          requiresSignature: true,
          signatureUrl: { $exists: true, $ne: null },
        });
        break;
    }

    if (threshold > 0) {
      progress.push({
        badge,
        current,
        threshold,
        percentage: Math.min(100, Math.floor((current / threshold) * 100)),
      });
    }
  }

  return progress;
}

/**
 * Initialize default badges for a restaurant
 */
export async function initializeDefaultBadges(): Promise<void> {
  const defaultBadges = [
    // Performance Badges
    {
      name: 'First Task',
      description: 'Complete your first task',
      icon: '🥇',
      category: 'performance',
      criteria: { type: 'tasks_completed', threshold: 1 },
      rarity: 'common',
      pointsBonus: 10,
    },
    {
      name: 'Task Master',
      description: 'Complete 50 tasks',
      icon: '🎯',
      category: 'performance',
      criteria: { type: 'tasks_completed', threshold: 50 },
      rarity: 'rare',
      pointsBonus: 100,
    },
    {
      name: 'Picture Perfect',
      description: 'Complete 50 photo tasks',
      icon: '📸',
      category: 'performance',
      criteria: { type: 'photo_tasks', threshold: 50 },
      rarity: 'rare',
      pointsBonus: 75,
    },
    {
      name: 'Sign Master',
      description: 'Complete 25 signature tasks',
      icon: '✍️',
      category: 'performance',
      criteria: { type: 'signature_tasks', threshold: 25 },
      rarity: 'rare',
      pointsBonus: 50,
    },

    // Consistency Badges
    {
      name: 'Hot Streak',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      category: 'consistency',
      criteria: { type: 'streak', threshold: 7 },
      rarity: 'rare',
      pointsBonus: 100,
    },
    {
      name: 'Unstoppable',
      description: 'Maintain a 14-day streak',
      icon: '💪',
      category: 'consistency',
      criteria: { type: 'streak', threshold: 14 },
      rarity: 'epic',
      pointsBonus: 250,
    },
    {
      name: 'Legendary',
      description: 'Maintain a 30-day streak',
      icon: '🌟',
      category: 'consistency',
      criteria: { type: 'streak', threshold: 30 },
      rarity: 'legendary',
      pointsBonus: 500,
    },

    // Special Badges
    {
      name: 'VIP',
      description: 'Earn 5,000 points',
      icon: '💎',
      category: 'special',
      criteria: { type: 'points', threshold: 5000 },
      rarity: 'epic',
      pointsBonus: 500,
    },
    {
      name: 'Legend',
      description: 'Earn 10,000 points',
      icon: '👑',
      category: 'special',
      criteria: { type: 'points', threshold: 10000 },
      rarity: 'legendary',
      pointsBonus: 1000,
    },

    // Custom Badges
    {
      name: 'Perfect Week',
      description: '100% task completion for 7 days',
      icon: '🏆',
      category: 'performance',
      criteria: { type: 'custom', customCheck: 'perfect_week' },
      rarity: 'epic',
      pointsBonus: 300,
    },
    {
      name: 'Speed Demon',
      description: 'Complete a workflow in record time',
      icon: '⚡',
      category: 'performance',
      criteria: { type: 'custom', customCheck: 'speed_demon' },
      rarity: 'rare',
      pointsBonus: 150,
    },
  ];

  for (const badgeData of defaultBadges) {
    const existing = await Badge.findOne({ name: badgeData.name });
    if (!existing) {
      await Badge.create(badgeData);
    }
  }
}
