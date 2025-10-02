import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Insight from '@/models/Insight';
import { verifyAuth, unauthorizedResponse } from '@/middleware/auth';

/**
 * GET /api/insights/[restaurantId]
 * Get all insights for a restaurant
 */
export async function GET(
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

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const query: Record<string, unknown> = { restaurantId: params.restaurantId };
    if (type) query.type = type;
    if (status) query.status = status;

    const insights = await Insight.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Insight.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        total,
        limit,
        skip,
        hasMore: total > skip + insights.length,
      },
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
