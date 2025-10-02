import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { InsightGenerator } from '@/services/InsightGenerator';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * POST /api/insights/[restaurantId]/generate
 * Generate new insights for a restaurant
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.restaurantId !== params.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { startDate, endDate, type = 'weekly' } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const generator = new InsightGenerator();
    const insight = await generator.generateInsights(
      params.restaurantId,
      new Date(startDate),
      new Date(endDate),
      type
    );

    return NextResponse.json({
      success: true,
      message: 'Insights generated successfully',
      data: insight,
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
