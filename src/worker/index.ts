/**
 * Background Worker for POS Data Synchronization
 *
 * This worker processes jobs from the BullMQ queue and runs in a separate process.
 * Deploy this to Railway or Render as a standalone service.
 *
 * Setup:
 * 1. Set environment variables (REDIS_URL, MONGODB_URI, etc.)
 * 2. Run: npm run worker
 * 3. Deploy to Railway/Render
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import connectDB from '../lib/mongodb';
import SyncJob from '../models/SyncJob';
import Restaurant from '../models/Restaurant';
import { ToastIntegration } from '../services/ToastIntegration';
import { ToastConfigService } from '../services/ToastConfigService';
import { EmailService } from '../services/EmailService';
import { InsightGenerator } from '../services/InsightGenerator';
import { SyncJobData } from '../lib/queue';

const emailService = new EmailService();

const QUEUE_NAME = 'pos-sync';

/**
 * Process a sync job
 */
async function processSyncJob(job: Job<SyncJobData>) {
  const { restaurantId, posType, credentials, options, notificationEmail } = job.data;

  console.log(`🔄 Processing sync job ${job.id} for restaurant ${restaurantId}`);

  // Connect to MongoDB
  await connectDB();

  // Find the SyncJob record
  const syncJob = await SyncJob.findOne({ jobId: job.id });
  if (!syncJob) {
    throw new Error(`SyncJob not found for job ${job.id}`);
  }

  // Update status to processing
  syncJob.status = 'processing';
  syncJob.startedAt = new Date();
  syncJob.attempts += 1;
  await syncJob.save();

  try {
    const startTime = Date.now();

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${restaurantId}`);
    }

    // Process based on POS type
    switch (posType) {
      case 'toast': {
        const toastService = new ToastIntegration();

        // Connect and sync data
        const syncResult = await toastService.connectRestaurant(restaurantId, {
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          locationGuid: credentials.locationGuid || ''
        });

        console.log(`✅ Toast sync completed for restaurant ${restaurantId}`);
        console.log(`📊 Imported ${syncResult.ordersImported} orders`);

        // Update sync job progress with actual imported count
        syncJob.progress.ordersProcessed = syncResult.ordersImported;
        await syncJob.save();

        // Fetch restaurant configuration (timezone, service areas, etc.)
        console.log(`🔧 Fetching restaurant configuration...`);
        const configService = new ToastConfigService();
        await configService.fetchAllConfig(restaurantId);
        console.log(`✅ Configuration fetched and cached`);

        // Generate AI insights from imported transactions
        console.log(`🤖 Generating AI insights for restaurant ${restaurantId}...`);
        const insightGenerator = new InsightGenerator();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        await insightGenerator.generateInsights(restaurantId, startDate, endDate);
        console.log(`✅ Insights generated successfully`);

        // Mark restaurant as connected
        restaurant.posConfig.isConnected = true;
        await restaurant.save();

        break;
      }

      case 'square':
      case 'clover':
        throw new Error(`${posType} integration not yet implemented`);

      default:
        throw new Error(`Unknown POS type: ${posType}`);
    }

    const duration = Date.now() - startTime;

    // Update sync job with results
    syncJob.status = 'completed';
    syncJob.completedAt = new Date();
    syncJob.result = {
      ordersImported: syncJob.progress.ordersProcessed,
      ordersFailed: 0,
      totalPages: syncJob.progress.totalPages || 0,
      duration,
      startDate: options?.startDate || new Date(),
      endDate: options?.endDate || new Date()
    };
    await syncJob.save();

    console.log(`✅ Sync job ${job.id} completed in ${duration}ms`);

    // Return result for job
    return {
      success: true,
      restaurantId,
      ordersImported: syncJob.progress.ordersProcessed,
      duration
    };

  } catch (error) {
    console.error(`❌ Sync job ${job.id} failed:`, error);

    // Update sync job with error
    syncJob.status = 'failed';
    syncJob.completedAt = new Date();
    syncJob.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'SYNC_FAILED',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date()
    };
    await syncJob.save();

    // Re-throw to let BullMQ handle retries
    throw error;
  }
}

/**
 * Create and start the worker
 */
function startWorker() {
  const redisConnection = getRedisConnection();

  if (!redisConnection) {
    console.error('❌ Redis connection not available. Worker cannot start.');
    console.error('Please set REDIS_URL environment variable.');
    process.exit(1);
  }

  const worker = new Worker<SyncJobData>(
    QUEUE_NAME,
    processSyncJob,
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs simultaneously
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000 // per second
      }
    }
  );

  // Worker event handlers
  worker.on('completed', async (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);

    // Send email notification
    try {
      await connectDB();

      const syncJob = await SyncJob.findOne({ jobId: job.id });
      if (syncJob && !syncJob.notificationSent && syncJob.notificationEmail) {
        const restaurant = await Restaurant.findById(syncJob.restaurantId);

        if (restaurant && syncJob.result) {
          await emailService.sendSyncCompletedEmail(
            syncJob.notificationEmail,
            restaurant.name,
            syncJob.result.ordersImported,
            syncJob.result.duration
          );

          console.log(`📧 Sent completion email to: ${syncJob.notificationEmail}`);

          syncJob.notificationSent = true;
          await syncJob.save();
        }
      }
    } catch (error) {
      console.error('Failed to send completion notification:', error);
    }
  });

  worker.on('failed', async (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error.message);

    // Send failure notification
    try {
      await connectDB();

      const syncJob = await SyncJob.findOne({ jobId: job?.id });
      if (syncJob && !syncJob.notificationSent && syncJob.notificationEmail) {
        const restaurant = await Restaurant.findById(syncJob.restaurantId);

        if (restaurant) {
          await emailService.sendSyncFailedEmail(
            syncJob.notificationEmail,
            restaurant.name,
            error.message
          );

          console.log(`📧 Sent failure email to: ${syncJob.notificationEmail}`);

          syncJob.notificationSent = true;
          await syncJob.save();
        }
      }
    } catch (notificationError) {
      console.error('Failed to send failure notification:', notificationError);
    }
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  console.log('🚀 Worker started and listening for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  return worker;
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker();
}

export { startWorker, processSyncJob };
