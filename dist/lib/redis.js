"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConnection = getRedisConnection;
exports.closeRedisConnection = closeRedisConnection;
const ioredis_1 = require("ioredis");
/**
 * Redis Connection
 * Used for BullMQ job queue
 *
 * Setup Instructions:
 * 1. Create free Redis instance at https://upstash.com
 * 2. Get REDIS_URL from Upstash dashboard
 * 3. Add to Vercel environment variables
 */
let redis = null;
function getRedisConnection() {
    if (redis) {
        return redis;
    }
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        // In development, Redis is optional - return null to skip queue operations
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Redis not configured - background jobs disabled in development');
            return null;
        }
        throw new Error('REDIS_URL environment variable is not set. ' +
            'Please create a Redis instance at https://upstash.com and add the URL to your environment variables.');
    }
    try {
        redis = new ioredis_1.Redis(redisUrl, {
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
            // Upstash requires TLS
            tls: redisUrl.includes('upstash') ? {} : undefined
        });
        redis.on('error', (error) => {
            console.error('Redis connection error:', error);
        });
        redis.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });
        return redis;
    }
    catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
}
// Close connection gracefully
async function closeRedisConnection() {
    if (redis) {
        await redis.quit();
        redis = null;
        console.log('Redis connection closed');
    }
}
