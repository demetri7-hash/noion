import { Redis } from 'ioredis';

/**
 * Redis Connection
 * Used for BullMQ job queue
 *
 * Setup Instructions:
 * 1. Create free Redis instance at https://upstash.com
 * 2. Get REDIS_URL from Upstash dashboard
 * 3. Add to Vercel environment variables
 */

let redis: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error(
      'REDIS_URL environment variable is not set. ' +
      'Please create a Redis instance at https://upstash.com and add the URL to your environment variables.'
    );
  }

  try {
    redis = new Redis(redisUrl, {
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
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Close connection gracefully
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis connection closed');
  }
}
