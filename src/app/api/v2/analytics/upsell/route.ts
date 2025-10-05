import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import { calculateUpsellOpportunities } from '@/lib/analytics/upsellAnalytics';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/v2/analytics/upsell
 * Get upsell opportunities for the restaurant
 *
 * Available to all authenticated users (employees can see opportunities)
 */
export async function GET(request: NextRequest) {
  // Allow all authenticated users to view upsell opportunities
  // This helps employees understand what they should be suggesting
  const authResult = await authorize('analytics:own', 'read')(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    await connectDB();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '90');

    const endDate = new Date();
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Calculate upsell opportunities
    const result = await calculateUpsellOpportunities(user.restaurantId, {
      startDate,
      endDate,
      minTransactions: 50 // Need at least 50 transactions for meaningful analysis
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Upsell analytics error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate upsell opportunities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
