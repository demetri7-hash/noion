export const dynamic = 'force-dynamic';

/**
 * Single Insight API
 *
 * GET /api/insights/[id]
 * Returns a single insight with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/middleware/authorize';
import Insight from '@/models/Insight';
import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { insightId: string } }
) {
  // Authorize
  const authResult = await authorize('insights', 'read')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    await connectDB();

    const insightId = params.insightId;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(insightId)) {
      return NextResponse.json(
        { error: 'Invalid insight ID' },
        { status: 400 }
      );
    }

    // Fetch insight
    const insight = await Insight.findById(insightId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this restaurant's insights
    if (insight.restaurantId.toString() !== user.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied to this insight' },
        { status: 403 }
      );
    }

    // Mark as viewed if not already
    if (!insight.engagement.reportViewed) {
      await insight.markAsViewed();
    }

    return NextResponse.json({
      success: true,
      data: insight
    });

  } catch (error) {
    console.error('Fetch insight error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch insight',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/insights/[id]
 * Update insight (mark recommendation as implemented, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { insightId: string } }
) {
  const authResult = await authorize('insights', 'update')(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    await connectDB();

    const insightId = params.insightId;
    const body = await request.json();

    if (!Types.ObjectId.isValid(insightId)) {
      return NextResponse.json(
        { error: 'Invalid insight ID' },
        { status: 400 }
      );
    }

    const insight = await Insight.findById(insightId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    if (insight.restaurantId.toString() !== user.restaurantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Handle recommendation implementation
    if (body.action === 'implement_recommendation') {
      await insight.markRecommendationImplemented(body.recommendationId);
      return NextResponse.json({
        success: true,
        message: 'Recommendation marked as implemented',
        data: insight
      });
    }

    // Handle viewing time tracking
    if (body.action === 'track_viewing_time') {
      await insight.markAsViewed(body.viewingTime);
      return NextResponse.json({
        success: true,
        message: 'Viewing time tracked',
        data: insight
      });
    }

    // Handle dismissal
    if (body.action === 'dismiss') {
      insight.status = 'dismissed';
      await insight.save();
      return NextResponse.json({
        success: true,
        message: 'Insight dismissed',
        data: insight
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Update insight error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update insight',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
