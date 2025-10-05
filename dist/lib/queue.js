"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncQueue = getSyncQueue;
exports.enqueueSyncJob = enqueueSyncJob;
exports.getJobStatus = getJobStatus;
exports.getRestaurantJobs = getRestaurantJobs;
exports.closeSyncQueue = closeSyncQueue;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
const QUEUE_NAME = 'pos-sync';
let syncQueue = null;
/**
 * Get or create the sync queue
 */
function getSyncQueue() {
    if (syncQueue) {
        return syncQueue;
    }
    const redisConnection = (0, redis_1.getRedisConnection)();
    // If Redis is not available (dev mode), return null
    if (!redisConnection) {
        console.warn('⚠️  Sync queue not available - Redis not configured');
        return null;
    }
    const queueOptions = {
        connection: redisConnection,
        defaultJobOptions: {
            attempts: 3, // Retry up to 3 times
            backoff: {
                type: 'exponential',
                delay: 5000 // Start with 5 second delay, then 10s, 20s
            },
            removeOnComplete: {
                count: 100, // Keep last 100 completed jobs
                age: 7 * 24 * 60 * 60 // Keep for 7 days
            },
            removeOnFail: {
                count: 500, // Keep last 500 failed jobs for debugging
                age: 30 * 24 * 60 * 60 // Keep for 30 days
            }
        }
    };
    syncQueue = new bullmq_1.Queue(QUEUE_NAME, queueOptions);
    // Queue event handlers
    syncQueue.on('error', (error) => {
        console.error('Queue error:', error);
    });
    console.log('✅ Sync queue initialized');
    return syncQueue;
}
/**
 * Add a new sync job to the queue
 */
async function enqueueSyncJob(data, priority = 0) {
    const queue = getSyncQueue();
    // If queue is not available (dev mode without Redis), generate a mock job ID
    if (!queue) {
        const mockJobId = `dev-sync-${data.restaurantId}-${Date.now()}`;
        console.warn(`⚠️  Background sync not available in development - would sync restaurant ${data.restaurantId}`);
        return mockJobId;
    }
    const job = await queue.add('sync-pos-data', data, {
        priority, // Lower number = higher priority
        jobId: `sync-${data.restaurantId}-${Date.now()}` // Unique job ID
    });
    console.log(`✅ Enqueued sync job ${job.id} for restaurant ${data.restaurantId}`);
    return job.id;
}
/**
 * Get job status
 */
async function getJobStatus(jobId) {
    const queue = getSyncQueue();
    if (!queue) {
        return null;
    }
    const job = await queue.getJob(jobId);
    if (!job) {
        return null;
    }
    const state = await job.getState();
    const progress = job.progress;
    return {
        id: job.id,
        state,
        progress,
        data: job.data,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        returnvalue: job.returnvalue
    };
}
/**
 * Get all jobs for a restaurant
 */
async function getRestaurantJobs(restaurantId) {
    const queue = getSyncQueue();
    if (!queue) {
        return [];
    }
    // Get all jobs
    const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed()
    ]);
    const allJobs = [...waiting, ...active, ...completed, ...failed];
    // Filter by restaurant ID
    const restaurantJobs = allJobs.filter((job) => job.data.restaurantId === restaurantId);
    return Promise.all(restaurantJobs.map(async (job) => ({
        id: job.id,
        state: await job.getState(),
        progress: job.progress,
        createdAt: job.timestamp,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason
    })));
}
/**
 * Close queue connection
 */
async function closeSyncQueue() {
    if (syncQueue) {
        await syncQueue.close();
        syncQueue = null;
        console.log('Sync queue closed');
    }
}
