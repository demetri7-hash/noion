import { NextRequest, NextResponse } from 'next/server';
import { correlationEngine } from '../../../../../services/CorrelationEngine';
import { authorize } from '../../../../../middleware/authorize';

/**
 * POST /api/analytics/correlations/discover
 * Trigger correlation discovery for a restaurant
 * Analyzes historical data to find patterns with weather, events, holidays
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function POST(request: NextRequest) {
  // Check authorization
  const authCheck = await authorize('analytics:team', 'read')(request);
  if (authCheck instanceof NextResponse) return authCheck;

  const { user } = authCheck;

  try {
    const restaurantId = user.restaurantId;

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 90 days for better pattern discovery
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Run correlation discovery
    const result = await correlationEngine.discoverCorrelations(
      restaurantId,
      startDate,
      endDate
    );

    // Contribute to global learning
    await correlationEngine.contributeToGlobalLearning(restaurantId);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: 'Correlation discovery completed successfully'
      }
    });

  } catch (error: any) {
    console.error('Error discovering correlations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover correlations' },
      { status: 500 }
    );
  }
}
