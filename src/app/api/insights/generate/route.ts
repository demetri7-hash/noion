export const dynamic = 'force-dynamic';

/**
 * POST /api/insights/generate
 * Generate new insights for the authenticated user's restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import connectDB from '@/lib/mongodb';
import { InsightGenerator } from '@/services/InsightGenerator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authResult = await authorize('insights', 'create')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    await connectDB();

    const body = await request.json();
    const { startDate, endDate, type = 'weekly' } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const generator = new InsightGenerator();
    const insight = await generator.generateInsights(
      user.restaurantId,
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
      {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
