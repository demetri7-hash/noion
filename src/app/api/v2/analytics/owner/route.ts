/**
 * Owner Analytics API
 *
 * GET /api/v2/analytics/owner
 * Returns complete business metrics for owners
 *
 * Query params:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { calculateOwnerAnalytics } from '@/lib/analytics/ownerAnalytics';
import connectDB from '@/lib/mongodb';

// Force Node.js runtime for Casbin compatibility
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Authorize: only owners and admins can read business-wide analytics
  const authResult = await authorize('analytics', 'read')(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }
  const { user } = authResult;

  // Only admins and owners can access this endpoint
  if (!['admin', 'owner'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Admin or Owner role required' },
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

    // Calculate analytics for entire business
    const analytics = await calculateOwnerAnalytics(
      user.restaurantId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Owner analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
