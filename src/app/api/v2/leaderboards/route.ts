/**
 * Leaderboards API
 * GET /api/v2/leaderboards?type=daily|weekly|monthly|all-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { PointsHistory, Restaurant } from '@/models';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - Get leaderboard rankings
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('leaderboard:all', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all-time';
    const limit = parseInt(searchParams.get('limit') || '50');

    let leaderboard;

    switch (type) {
      case 'daily':
        leaderboard = await getDailyLeaderboard(user.restaurantId, limit);
        break;
      case 'weekly':
        leaderboard = await getWeeklyLeaderboard(user.restaurantId, limit);
        break;
      case 'monthly':
        leaderboard = await getMonthlyLeaderboard(user.restaurantId, limit);
        break;
      case 'all-time':
      default:
        leaderboard = await getAllTimeLeaderboard(user.restaurantId, limit);
        break;
    }

    // Find current user's rank
    const userRank = leaderboard.findIndex((entry: any) => entry.userId === user.userId) + 1;

    return NextResponse.json({
      success: true,
      data: {
        type,
        leaderboard,
        userRank: userRank || null,
        total: leaderboard.length,
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * Get daily leaderboard (today's points)
 */
async function getDailyLeaderboard(restaurantId: string, limit: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rankings = await PointsHistory.aggregate([
    {
      $match: {
        restaurantId: restaurantId,
        timestamp: { $gte: today, $lt: tomorrow },
      },
    },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$points' },
      },
    },
    {
      $sort: { totalPoints: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  // Enrich with user data
  const enriched = await enrichLeaderboard(rankings, restaurantId);
  return enriched;
}

/**
 * Get weekly leaderboard (this week's points, Monday-Sunday)
 */
async function getWeeklyLeaderboard(restaurantId: string, limit: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const rankings = await PointsHistory.aggregate([
    {
      $match: {
        restaurantId: restaurantId,
        timestamp: { $gte: monday, $lt: nextMonday },
      },
    },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$points' },
      },
    },
    {
      $sort: { totalPoints: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  const enriched = await enrichLeaderboard(rankings, restaurantId);
  return enriched;
}

/**
 * Get monthly leaderboard (this month's points)
 */
async function getMonthlyLeaderboard(restaurantId: string, limit: number) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rankings = await PointsHistory.aggregate([
    {
      $match: {
        restaurantId: restaurantId,
        timestamp: { $gte: firstDay, $lt: nextMonth },
      },
    },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$points' },
      },
    },
    {
      $sort: { totalPoints: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  const enriched = await enrichLeaderboard(rankings, restaurantId);
  return enriched;
}

/**
 * Get all-time leaderboard (total points)
 */
async function getAllTimeLeaderboard(restaurantId: string, limit: number) {
  const restaurant = await Restaurant.findById(restaurantId).lean();

  if (!restaurant) {
    return [];
  }

  // For now, single user per restaurant - return owner data
  // In multi-user setup, this would query all users for this restaurant
  const leaderboard = [
    {
      rank: 1,
      userId: restaurant.owner.userId,
      name: restaurant.owner.email?.split('@')[0] || 'User',
      email: restaurant.owner.email,
      points: restaurant.owner.points || 0,
      level: restaurant.owner.level || 1,
      streak: restaurant.owner.streak || 0,
    },
  ];

  return leaderboard;
}

/**
 * Enrich leaderboard with user details
 */
async function enrichLeaderboard(rankings: any[], restaurantId: string) {
  const enriched = [];

  for (let i = 0; i < rankings.length; i++) {
    const ranking = rankings[i];
    const userId = ranking._id.toString();

    // Get user details from Restaurant
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      'owner.userId': userId,
    }).lean();

    if (restaurant) {
      enriched.push({
        rank: i + 1,
        userId,
        name: restaurant.owner.email?.split('@')[0] || 'User',
        email: restaurant.owner.email,
        points: ranking.totalPoints,
        level: restaurant.owner.level || 1,
        streak: restaurant.owner.streak || 0,
      });
    }
  }

  return enriched;
}
