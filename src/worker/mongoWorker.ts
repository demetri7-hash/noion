/**
 * MongoDB-Based Background Worker for POS Data Synchronization
 *
 * This worker processes jobs from the MongoDB queue and runs continuously.
 * Deploy this to Railway or Render as a standalone service.
 *
 * Setup:
 * 1. Set environment variables (MONGODB_URI, etc.)
 * 2. Run: npm run worker:mongo
 * 3. Deploy to Railway/Render
 */

import connectDB from '../lib/mongodb';
import {
  getNextJob,
  updateJobProgress,
  completeJob,
  failJob,
} from '../lib/mongoQueue';
import Restaurant from '../models/Restaurant';
import { SmartToastSync } from '../services/SmartToastSync';
import { ToastConfigService } from '../services/ToastConfigService';
import { decryptToastCredentials } from '../utils/toastEncryption';

const POLL_INTERVAL = 5000; // Poll every 5 seconds
const MAX_RETRIES = 3;

/**
 * Process a sync job
 */
async function processSyncJob() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Get next pending job
    const job = await getNextJob();

    if (!job) {
      // No jobs to process
      return false;
    }

    console.log(`🔄 Processing sync job ${job.jobId} for restaurant ${job.restaurantId}`);

    const startTime = Date.now();

    try {
      // Get restaurant
      const restaurant = await Restaurant.findById(job.restaurantId);
      if (!restaurant) {
        throw new Error(`Restaurant not found: ${job.restaurantId}`);
      }

      // Get credentials from restaurant config
      if (!restaurant.posConfig?.clientId || !restaurant.posConfig?.encryptedClientSecret || !restaurant.posConfig?.locationId) {
        throw new Error('Toast credentials not configured');
      }

      const credentials = decryptToastCredentials({
        clientId: restaurant.posConfig.clientId,
        encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
        locationId: restaurant.posConfig.locationId
      });

      // Process based on POS type
      if (job.posType === 'toast') {
        const smartSync = new SmartToastSync();

        let lastProgress: any = {};

        // Run the sync with progress callback
        await smartSync.smartSync(
          String(job.restaurantId),
          async (progress) => {
            console.log(`📊 Progress: ${progress.currentChunk}/${progress.totalChunks} (${progress.percentComplete?.toFixed(1)}%)`);

            lastProgress = progress;

            await updateJobProgress(job.jobId, {
              currentPage: progress.currentChunk,
              totalPages: progress.totalChunks,
              ordersProcessed: progress.totalImported,
              estimatedTotal: progress.transactionsImported,
              percentComplete: progress.percentComplete
            });
          }
        );

        console.log(`✅ Toast sync completed for restaurant ${job.restaurantId}`);
        console.log(`📊 Imported ${lastProgress.totalImported || 0} orders in ${lastProgress.totalChunks || 0} chunks`);

        // Fetch restaurant configuration (timezone, service areas, etc.)
        console.log(`🔧 Fetching restaurant configuration...`);
        const configService = new ToastConfigService();
        await configService.fetchAllConfig(String(job.restaurantId));
        console.log(`✅ Configuration fetched and cached`);

        // Mark restaurant as connected and update last sync time
        restaurant.posConfig.isConnected = true;
        restaurant.posConfig.lastSyncAt = new Date();
        await restaurant.save();

        const duration = Date.now() - startTime;

        // Complete the job
        await completeJob(job.jobId, {
          ordersImported: lastProgress.totalImported || 0,
          ordersFailed: 0,
          totalPages: lastProgress.totalChunks || 0,
          duration,
          startDate: lastProgress.chunkStartDate || new Date(),
          endDate: lastProgress.chunkEndDate || new Date()
        });

        console.log(`✅ Job ${job.jobId} completed in ${duration}ms`);

      } else {
        throw new Error(`${job.posType} integration not yet implemented`);
      }

      return true;

    } catch (error) {
      console.error(`❌ Job ${job.jobId} failed:`, error);

      // Fail the job (will auto-retry if under maxAttempts)
      await failJob(job.jobId, error instanceof Error ? error : new Error(String(error)));

      return true;
    }

  } catch (error) {
    console.error('Worker error:', error);
    return false;
  }
}

/**
 * Start the worker loop
 */
async function startWorker() {
  console.log('🚀 MongoDB Worker starting...');

  // Graceful shutdown handling
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n👋 Shutting down worker...');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Main worker loop
  while (!isShuttingDown) {
    try {
      const processed = await processSyncJob();

      if (!processed) {
        // No job was processed, wait before polling again
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      } else {
        // Job was processed, immediately check for next job
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Worker loop error:', error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch(error => {
    console.error('Fatal worker error:', error);
    process.exit(1);
  });
}

export { startWorker };
