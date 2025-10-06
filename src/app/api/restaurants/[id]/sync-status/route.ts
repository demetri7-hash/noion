import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Restaurant from '@/models/Restaurant';
import { getActiveJobs } from '@/lib/mongoQueue';

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

    const restaurant = await Restaurant.findById(params.id).select('name');

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get active sync jobs from MongoDB queue
    const activeJobs = await getActiveJobs(params.id);
    const currentJob = activeJobs[0]; // Get most recent active job

    // Build sync progress from job data
    let syncProgress;
    if (currentJob) {
      const progress = currentJob.progress || {};
      const percentComplete = progress.totalPages
        ? ((progress.currentPage || 0) / progress.totalPages) * 100
        : 0;

      syncProgress = {
        status: currentJob.status === 'processing' ? 'syncing' : 'pending',
        currentChunk: progress.currentPage || 0,
        totalChunks: progress.totalPages || 0,
        percentComplete,
        transactionsImported: progress.ordersProcessed || 0,
        estimatedTimeRemaining: progress.estimatedTotal
          ? Math.ceil(((progress.estimatedTotal - progress.ordersProcessed) / 100) * 2)
          : 0,
        message: `Syncing page ${progress.currentPage || 0}/${progress.totalPages || 0}...`,
        startedAt: currentJob.startedAt,
        lastUpdatedAt: currentJob.updatedAt,
        completedAt: null,
        error: currentJob.error?.message || null
      };
    } else {
      // No active job - return idle state
      syncProgress = {
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
    }

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
 * Manually trigger a Toast sync
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
    const activeJobs = await getActiveJobs(params.id);
    if (activeJobs.length > 0) {
      return NextResponse.json(
        {
          error: 'Sync already in progress',
          jobId: activeJobs[0].jobId
        },
        { status: 409 }
      );
    }

    // Enqueue new sync job
    const { enqueueSyncJob } = await import('@/lib/mongoQueue');
    const jobId = await enqueueSyncJob({
      restaurantId: params.id,
      posType: 'toast',
      notificationEmail: restaurant.owner?.email
    });

    return NextResponse.json({
      message: 'Sync job queued successfully',
      jobId
    });

  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync', details: error.message },
      { status: 500 }
    );
  }
}
