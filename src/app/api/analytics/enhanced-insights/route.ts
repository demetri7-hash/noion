import { NextRequest, NextResponse } from 'next/server';
import { enhancedInsightsService } from '../../../../services/EnhancedInsightsService';
import { verifyToken } from '../../../../lib/auth';

/**
 * GET /api/analytics/enhanced-insights
 * Get enhanced insights with weather, events, holidays, and predictions
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.restaurantId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const restaurantId = decoded.restaurantId;

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to last 30 days if not provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate enhanced insights
    const insights = await enhancedInsightsService.generateEnhancedInsights(
      restaurantId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: insights
    });

  } catch (error: any) {
    console.error('Error generating enhanced insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
