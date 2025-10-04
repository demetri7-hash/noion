import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Correlation from '../../../models/Correlation';

/**
 * GET /api/correlations
 * Fetch AI-discovered correlations for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID required' },
        { status: 400 }
      );
    }

    // Fetch active correlations for this restaurant
    const correlations = await Correlation.find({
      restaurantId,
      isActive: true
    }).sort({ 'statistics.confidence': -1, createdAt: -1 }).limit(10);

    return NextResponse.json({
      success: true,
      data: {
        correlations: correlations.map(c => ({
          id: c._id,
          type: c.type,
          pattern: c.pattern,
          factor: c.factor,
          outcome: c.outcome,
          statistics: c.statistics,
          createdAt: c.createdAt,
          validatedAt: c.validatedAt
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching correlations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch correlations' },
      { status: 500 }
    );
  }
}
