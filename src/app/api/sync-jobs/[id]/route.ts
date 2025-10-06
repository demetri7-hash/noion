import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SyncJob from '@/models/SyncJob';
import { getJobStatus } from '@/lib/mongoQueue';

/**
 * GET /api/sync-jobs/[id]
 * Get the status of a sync job
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Find the sync job in database
    const syncJob = await SyncJob.findById(params.id);

    if (!syncJob) {
      return NextResponse.json(
        { error: 'Sync job not found' },
        { status: 404 }
      );
    }

    // Get real-time status from queue
    let queueStatus = null;
    try {
      queueStatus = await getJobStatus(syncJob.jobId);
    } catch (error) {
      console.warn('Failed to get queue status:', error);
    }

    // Combine database and queue information
    const response = {
      id: syncJob._id,
      restaurantId: syncJob.restaurantId,
      posType: syncJob.posType,
      status: syncJob.status,
      jobId: syncJob.jobId,
      progress: {
        ...syncJob.progress,
        // Override with real-time queue progress if available
        ...(queueStatus?.progress && typeof queueStatus.progress === 'object' ? queueStatus.progress : {})
      },
      result: syncJob.result,
      error: syncJob.error,
      attempts: syncJob.attempts,
      maxAttempts: syncJob.maxAttempts,
      createdAt: syncJob.createdAt,
      updatedAt: syncJob.updatedAt,
      startedAt: syncJob.startedAt,
      completedAt: syncJob.completedAt,
      notificationSent: syncJob.notificationSent,
      // Queue-specific data
      queueState: queueStatus?.state || null,
      queueProgress: queueStatus?.progress || null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get sync job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
