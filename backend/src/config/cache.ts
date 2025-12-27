// src/config/cache.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use DB 1 for caching (DB 0 for queues)
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Cache Redis connected');
});

redis.on('error', (err) => {
  logger.error('Cache Redis error:', err);
});

export default redis;

