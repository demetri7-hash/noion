/**
 * Manager Analytics API
 *
 * GET /api/v2/analytics/manager
 * Returns team performance metrics for managers
 *
 * Query params:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { calculateManagerAnalytics } from '@/lib/analytics/managerAnalytics';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  // Authorize: managers and above can read team analytics
  const authResult = await authorize('analytics', 'read')(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }
  const { user } = authResult;

  // Only managers, admins, and owners can access this endpoint
  if (!['manager', 'admin', 'owner'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Manager role or above required' },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    // Parse date range from query params
    const { searchParams } = new URL(request.url);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    // Calculate analytics for manager's team
    const analytics = await calculateManagerAnalytics(
      user.userId,
      user.restaurantId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Manager analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
