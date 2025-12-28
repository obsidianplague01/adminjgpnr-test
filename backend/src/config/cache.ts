// src/config/cache.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_CACHE_DB || '1'), // Use DB 1 for caching
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Redis max reconnection attempts reached');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect on specific errors
      return true;
    }
    return false;
  },
};

const redis = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
  logger.info('Cache Redis connecting...');
});

redis.on('ready', () => {
  logger.info('Cache Redis ready and accepting commands');
});

redis.on('error', (err) => {
  logger.error('Cache Redis error:', {
    message: err.message,
    code: (err as any).code,
  });
});

redis.on('close', () => {
  logger.warn('Cache Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info(`Cache Redis reconnecting after ${delay}ms`);
});

redis.on('end', () => {
  logger.warn('Cache Redis connection ended');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connection...');
  await redis.quit();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connection...');
  await redis.quit();
});

// Health check method
export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
};

export default redis;