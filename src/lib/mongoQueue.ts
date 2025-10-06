import mongoose from 'mongoose';
import SyncJob, { ISyncJob } from '@/models/SyncJob';

/**
 * MongoDB-based Queue Service
 *
 * Replaces Redis/BullMQ with a simple MongoDB-based queue.
 * 100% free - uses existing MongoDB instance.
 *
 * Features:
 * - Job queuing and processing
 * - Progress tracking
 * - Automatic retries
 * - Job cleanup
 */

export interface SyncJobData {
  restaurantId: string;
  posType: 'toast' | 'square' | 'clover';
  options?: {
    startDate?: Date;
    endDate?: Date;
    fullSync?: boolean;
  };
  notificationEmail?: string;
}

export interface JobProgress {
  currentPage?: number;
  totalPages?: number;
  ordersProcessed: number;
  estimatedTotal?: number;
  percentComplete?: number;
  message?: string;
}

/**
 * Enqueue a new sync job
 */
export async function enqueueSyncJob(data: SyncJobData): Promise<string> {
  const jobId = `sync-${data.restaurantId}-${Date.now()}`;

  const syncJob = await SyncJob.create({
    restaurantId: new mongoose.Types.ObjectId(data.restaurantId),
    posType: data.posType,
    status: 'pending',
    jobId,
    progress: {
      ordersProcessed: 0
    },
    attempts: 0,
    maxAttempts: 3,
    notificationEmail: data.notificationEmail
  });

  console.log(`✅ Enqueued sync job ${jobId} for restaurant ${data.restaurantId}`);

  return jobId;
}

/**
 * Get the next pending job to process
 */
export async function getNextJob(): Promise<ISyncJob | null> {
  // Find oldest pending job and mark it as processing
  const job = await SyncJob.findOneAndUpdate(
    {
      status: 'pending',
      attempts: { $lt: mongoose.model('SyncJob').schema.path('maxAttempts').default() }
    },
    {
      $set: {
        status: 'processing',
        startedAt: new Date()
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { createdAt: 1 }, // Oldest first (FIFO)
      new: true
    }
  );

  return job;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: JobProgress
): Promise<void> {
  await SyncJob.findOneAndUpdate(
    { jobId },
    {
      $set: {
        progress: {
          currentPage: progress.currentPage,
          totalPages: progress.totalPages,
          ordersProcessed: progress.ordersProcessed,
          estimatedTotal: progress.estimatedTotal
        },
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Mark job as completed
 */
export async function completeJob(
  jobId: string,
  result: {
    ordersImported: number;
    ordersFailed: number;
    totalPages: number;
    duration: number;
    startDate: Date;
    endDate: Date;
  }
): Promise<void> {
  await SyncJob.findOneAndUpdate(
    { jobId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        result
      }
    }
  );

  console.log(`✅ Job ${jobId} completed: ${result.ordersImported} orders imported`);
}

/**
 * Mark job as failed
 */
export async function failJob(
  jobId: string,
  error: Error
): Promise<void> {
  const job = await SyncJob.findOne({ jobId });

  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  // Check if we should retry
  const shouldRetry = job.attempts < job.maxAttempts;

  await SyncJob.findOneAndUpdate(
    { jobId },
    {
      $set: {
        status: shouldRetry ? 'pending' : 'failed',
        error: {
          message: error.message,
          code: (error as any).code,
          stack: error.stack,
          timestamp: new Date()
        },
        ...(shouldRetry ? {} : { completedAt: new Date() })
      }
    }
  );

  if (shouldRetry) {
    console.warn(`⚠️  Job ${jobId} failed (attempt ${job.attempts}/${job.maxAttempts}), will retry`);
  } else {
    console.error(`❌ Job ${jobId} failed permanently after ${job.attempts} attempts`);
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<ISyncJob | null> {
  return await SyncJob.findOne({ jobId });
}

/**
 * Get all jobs for a restaurant
 */
export async function getRestaurantJobs(
  restaurantId: string,
  limit: number = 10
): Promise<ISyncJob[]> {
  return await SyncJob.find({
    restaurantId: new mongoose.Types.ObjectId(restaurantId)
  })
    .sort({ createdAt: -1 })
    .limit(limit);
}

/**
 * Get active (pending or processing) jobs
 */
export async function getActiveJobs(restaurantId?: string): Promise<ISyncJob[]> {
  const query: any = {
    status: { $in: ['pending', 'processing'] }
  };

  if (restaurantId) {
    query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
  }

  return await SyncJob.find(query).sort({ createdAt: 1 });
}

/**
 * Clean up old completed jobs (keeps last 30 days)
 */
export async function cleanupOldJobs(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await SyncJob.deleteMany({
    status: { $in: ['completed', 'failed'] },
    completedAt: { $lt: thirtyDaysAgo }
  });

  if (result.deletedCount > 0) {
    console.log(`🧹 Cleaned up ${result.deletedCount} old sync jobs`);
  }

  return result.deletedCount;
}

/**
 * Cancel a job (if pending)
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const result = await SyncJob.findOneAndUpdate(
    { jobId, status: 'pending' },
    {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        error: {
          message: 'Job cancelled by user',
          timestamp: new Date()
        }
      }
    }
  );

  return result !== null;
}
