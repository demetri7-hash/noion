export const dynamic = 'force-dynamic';

/**
 * Insights List API
 *
 * GET /api/insights
 * Returns all insights for a restaurant with optional filtering
 *
 * Query params:
 * - type: Filter by insight type (free_discovery, weekly_summary, etc.)
 * - priority: Filter by priority (critical, high, medium, low)
 * - status: Filter by status (generated, sent, viewed, acted_upon, dismissed)
 * - limit: Max number of results (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import Insight, { InsightType, InsightPriority, InsightStatus } from '@/models/Insight';
import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Authorize
  const authResult = await authorize('insights', 'read')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // Build query
    const query: any = {
      restaurantId: new Types.ObjectId(user.restaurantId)
    };

    // Optional filters
    const type = searchParams.get('type');
    if (type && Object.values(InsightType).includes(type as InsightType)) {
      query.type = type;
    }

    const priority = searchParams.get('priority');
    if (priority && Object.values(InsightPriority).includes(priority as InsightPriority)) {
      query.priority = priority;
    }

    const status = searchParams.get('status');
    if (status && Object.values(InsightStatus).includes(status as InsightStatus)) {
      query.status = status;
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Fetch insights
    const insights = await Insight.find(query)
      .sort({ createdAt: -1, priority: 1 })
      .limit(Math.min(limit, 100))
      .skip(skip)
      .select('-aiAnalysis.rawResponse') // Exclude large raw response field
      .lean();

    const total = await Insight.countDocuments(query);

    // Calculate summary stats
    const stats = {
      total,
      byPriority: {
        critical: await Insight.countDocuments({ ...query, priority: InsightPriority.CRITICAL }),
        high: await Insight.countDocuments({ ...query, priority: InsightPriority.HIGH }),
        medium: await Insight.countDocuments({ ...query, priority: InsightPriority.MEDIUM }),
        low: await Insight.countDocuments({ ...query, priority: InsightPriority.LOW })
      },
      byStatus: {
        generated: await Insight.countDocuments({ ...query, status: InsightStatus.GENERATED }),
        sent: await Insight.countDocuments({ ...query, status: InsightStatus.SENT }),
        viewed: await Insight.countDocuments({ ...query, status: InsightStatus.VIEWED }),
        acted_upon: await Insight.countDocuments({ ...query, status: InsightStatus.ACTED_UPON }),
        dismissed: await Insight.countDocuments({ ...query, status: InsightStatus.DISMISSED })
      },
      totalRevenueOpportunity: insights.reduce((sum, i) => sum + (i.lostRevenue?.total || 0), 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        insights,
        stats,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + insights.length < total
        }
      }
    });

  } catch (error) {
    console.error('Fetch insights error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
