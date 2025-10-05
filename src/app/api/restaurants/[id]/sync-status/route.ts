import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';

/**
 * GET /api/restaurants/[id]/sync-status
 *
 * Returns the current Toast sync progress for a restaurant.
 * Used by the frontend to poll and display real-time sync progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const restaurant = await Restaurant.findById(params.id).select('posConfig.syncProgress name');

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Return sync progress or default idle state
    const syncProgress = restaurant.posConfig?.syncProgress || {
      status: 'idle',
      currentChunk: 0,
      totalChunks: 0,
      percentComplete: 0,
      transactionsImported: 0,
      estimatedTimeRemaining: 0,
      message: 'No sync in progress',
      startedAt: null,
      lastUpdatedAt: null,
      completedAt: null,
      error: null
    };

    return NextResponse.json({
      restaurantId: params.id,
      restaurantName: restaurant.name,
      syncProgress
    });

  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/restaurants/[id]/sync-status
 *
 * Manually trigger a Toast historical sync (optional future feature)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const restaurant = await Restaurant.findById(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check if sync already in progress
    if (restaurant.posConfig?.syncProgress?.status === 'syncing') {
      return NextResponse.json(
        {
          error: 'Sync already in progress',
          syncProgress: restaurant.posConfig.syncProgress
        },
        { status: 409 }
      );
    }

    // TODO: Trigger background sync job
    // For now, return a message that this feature is coming soon
    return NextResponse.json({
      message: 'Manual sync trigger coming soon. Please use the CLI script for now.',
      script: `DATABASE_URL='...' ENCRYPTION_KEY='...' npx tsx scripts/run-smart-toast-sync.ts ${params.id}`
    });

  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync', details: error.message },
      { status: 500 }
    );
  }
}
