/**
 * Employee Analytics API
 *
 * GET /api/v2/analytics/employee
 * Returns personal performance metrics for the authenticated employee
 *
 * Query params:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { calculateEmployeeAnalytics } from '@/lib/analytics/employeeAnalytics';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  // Authorize: employees can only read their own analytics
  const authResult = await authorize('analytics', 'read')(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }
  const { user } = authResult;

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

    // Calculate analytics for this employee
    const analytics = await calculateEmployeeAnalytics(
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
    console.error('Employee analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
