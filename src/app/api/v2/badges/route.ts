/**
 * Badges API
 * GET /api/v2/badges - Get all available badges
 * POST /api/v2/badges - Create new badge (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { Badge, UserBadge } from '@/models';
import { getUserBadges, getBadgeProgress } from '@/lib/badges';
import connectDB from '@/lib/mongodb';

export const runtime = 'nodejs';

/**
 * GET - List all badges or user's badges
 */
export async function GET(request: NextRequest) {
  const authResult = await authorize('gamification:own', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.userId;
    const showProgress = searchParams.get('progress') === 'true';

    // Get user's unlocked badges
    const unlockedBadges = await getUserBadges(userId);

    let response: any = {
      success: true,
      data: {
        unlocked: unlockedBadges,
      },
    };

    // Optionally include progress toward locked badges
    if (showProgress) {
      const progress = await getBadgeProgress(userId, user.restaurantId);
      response.data.progress = progress;
    }

    // Include all available badges
    const allBadges = await Badge.find({ isActive: true })
      .sort({ category: 1, rarity: 1 })
      .lean();
    response.data.available = allBadges;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new badge (admin only)
 */
export async function POST(request: NextRequest) {
  const authResult = await authorize('system:config', 'update')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      icon,
      category,
      criteria,
      rarity,
      pointsBonus,
    } = body;

    if (!name || !description || !icon || !category || !criteria) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const badge = await Badge.create({
      name,
      description,
      icon,
      category,
      criteria,
      rarity: rarity || 'common',
      pointsBonus: pointsBonus || 0,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: badge,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating badge:', error);
    return NextResponse.json(
      { error: 'Failed to create badge' },
      { status: 500 }
    );
  }
}
