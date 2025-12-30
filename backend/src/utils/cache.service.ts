// src/utils/cache.service.ts
import redis from '../config/cache';
import prisma from '../config/database';
import { logger } from './logger';
import { monitoring } from './monitoring.service';
import crypto from 'crypto';

export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private isRedisHealthy = false;

  constructor() {
    this.initializeHealthCheck();
  }

  private initializeHealthCheck() {
    // Check Redis health on startup
    this.checkRedisHealth();

    // Periodic health check every 30 seconds
    setInterval(() => {
      this.checkRedisHealth();
    }, 30000);
  }

  private async checkRedisHealth() {
    try {
      const redis = (await import('../config/cache')).default;
      await redis.ping();
      if (!this.isRedisHealthy) {
        logger.info('Redis connection restored');
      }
      this.isRedisHealthy = true;
    } catch (error) {
      if (this.isRedisHealthy) {
        logger.error('Redis connection lost');
      }
      this.isRedisHealthy = false;
    }
  }


  isHealthy(): boolean {
    return this.isRedisHealthy;
  }

  private async safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!this.isRedisHealthy) {
    logger.warn('Redis unavailable, using fallback');
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    logger.error('Redis operation failed:', error);
    this.isRedisHealthy = false;
    return fallback;
  }
  }

  async get<T>(key: string): Promise<T | null> {
 
    if (this.isRedisHealthy) {
      try {
        const data = await redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
        logger.error(`Redis get failed for ${key}:`, error);
        monitoring.captureException(error as Error, { operation: 'cache.get', key });
        this.isRedisHealthy = false;
        // Continue to DB fallback
      }
    }

    // 2. DB Fallback (only for analytics)
    if (key.startsWith('analytics:')) {
      try {
        const dbCache = await prisma.analyticsCache.findUnique({
          where: { 
            cacheKey: key,
            expiresAt: { gt: new Date() },
          },
        });

        if (dbCache) {
          logger.debug(`Cache HIT (DB fallback): ${key}`);
          return dbCache.data as T;
        }
      } catch (dbError) {
        logger.error(`DB cache get failed for ${key}:`, dbError);
        monitoring.captureException(dbError as Error, { operation: 'db-cache.get', key });
      }
    }

    return null;
  }
  
  
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const effectiveTTL = ttl || this.DEFAULT_TTL;

      // Try to write to Redis
      const redisSuccess = await this.safeRedisOperation(
        () => redis.setex(key, effectiveTTL, serialized).then(() => true),
        false
      );

      // Write to DB for analytics (persistent cache)
      if (key.startsWith('analytics:')) {
        const expiresAt = new Date(Date.now() + effectiveTTL * 1000);
        
        try {
          await prisma.analyticsCache.upsert({
            where: { cacheKey: key },
            update: { 
              data: value,
              expiresAt,
            },
            create: {
              cacheKey: key,
              data: value,
              expiresAt,
            },
          });
        } catch (dbError) {
          logger.error(`DB cache write failed for ${key}:`, dbError);
          // Continue even if DB write fails
        }
      }

      logger.debug(`Cache SET: ${key} (TTL: ${effectiveTTL}s, Redis: ${redisSuccess})`);
      return redisSuccess;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const redisSuccess = await this.safeRedisOperation(
        () => redis.del(key).then(() => true),
        false
      );

      if (key.startsWith('analytics:')) {
        try {
          await prisma.analyticsCache.delete({
            where: { cacheKey: key },
          });
        } catch {
          // Ignore if not found in DB
        }
      }

      logger.debug(`Cache DELETE: ${key} (Redis: ${redisSuccess})`);
      return redisSuccess;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

 async deletePattern(pattern: string): Promise<number> {
  
  if (!/^[a-zA-Z0-9:_-]+\*?$/.test(pattern)) {
    throw new Error('Invalid cache pattern - only alphanumeric, :, _, -, * allowed');
  }
  const likePattern = pattern.replace(/\*/g, '%').replace(/_/g, '\\_');
  
  const result = await prisma.$executeRawUnsafe(
    'DELETE FROM "AnalyticsCache" WHERE "cacheKey" LIKE $1 ESCAPE \'\\\'',
    likePattern
  );
  
  return Number(result);
}

  async del(key: string): Promise<boolean> {
    return await this.delete(key);
  }

  async flush(): Promise<boolean> {
    try {
      const redisSuccess = await this.safeRedisOperation(
        () => redis.flushdb().then(() => true),
        false
      );

      await prisma.analyticsCache.deleteMany({});
      
      logger.warn('All cache flushed');
      return redisSuccess;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    return await this.safeRedisOperation(
      () => redis.exists(key).then(result => result === 1),
      false
    );
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    
    const lockKey = `lock:${key}`;
    const lockValue = crypto.randomBytes(16).toString('hex');
    
    const lockAcquired = await redis.set(
      lockKey, 
      lockValue, 
      'EX',
      10,
      'NX'
    );
    
    if (!lockAcquired) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
      const retry = await this.get<T>(key);
      if (retry) return retry;
    }
    
    try {
      const data = await fetcher();
      await this.set(key, data, ttl);
      return data;
    } finally {
      const currentLock = await redis.get(lockKey);
      if (currentLock === lockValue) {
        await redis.del(lockKey);
      }
    }
  }

  async increment(key: string, amount = 1): Promise<number> {
    return await this.safeRedisOperation(
      () => redis.incrby(key, amount),
      0
    );
  }

    
  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.safeRedisOperation(
      () => redis.expire(key, seconds).then(() => true),
      false
    );
  }

    
  async ttl(key: string): Promise<number> {
    return await this.safeRedisOperation(
      () => redis.ttl(key),
      -1
    );
  }

  async getStats(): Promise<{
      redisHealthy: boolean;
      redisKeys: number;
      dbCacheRecords: number;
      expiredRecords: number;
    }> {
      try {
        const redisKeys = await this.safeRedisOperation(
          () => redis.dbsize(),
          0
        );

        const [dbCache, expired] = await Promise.all([
          prisma.analyticsCache.count(),
          prisma.analyticsCache.count({
            where: { expiresAt: { lt: new Date() } },
          }),
        ]);

        return {
          redisHealthy: this.isRedisHealthy,
          redisKeys,
          dbCacheRecords: dbCache,
          expiredRecords: expired,
        };
      } catch (error) {
        logger.error('Cache stats error:', error);
        return { 
          redisHealthy: this.isRedisHealthy,
          redisKeys: 0, 
          dbCacheRecords: 0, 
          expiredRecords: 0 
        };
      }
  }


  async cleanupExpired(): Promise<number> {
    try {
      const result = await prisma.analyticsCache.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      logger.info(`Cleaned up ${result.count} expired cache entries`);
      return result.count;
    } catch (error) {
      logger.error('Cache cleanup error:', error);
      return 0;
    }
  }

  generateAnalyticsKey(
    endpoint: string,
    params: Record<string, any>
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join('|');
    
    return `analytics:${endpoint}:${sortedParams}`;
  }

  
  async invalidateAllAnalytics(): Promise<void> {
    await this.deletePattern('analytics:*');
    logger.info('All analytics cache invalidated');
  }

  async flushAll(): Promise<boolean> {
    try {
      const redisSuccess = await this.safeRedisOperation(
        () => redis.flushall().then(() => true),
        false
      );

      // Also clear DB cache
      await prisma.analyticsCache.deleteMany({});
      
      logger.warn('All cache flushed');
      return redisSuccess;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    if (keys.length === 0) return [];

    const results = await this.safeRedisOperation(
      () => redis.mget(...keys),
      keys.map(() => null)
    );

    return results.map(data => {
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    });
  }

  
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();

      for (const { key, value, ttl } of entries) {
        const serialized = JSON.stringify(value);
        const effectiveTTL = ttl || this.DEFAULT_TTL;
        pipeline.setex(key, effectiveTTL, serialized);
      }

      await this.safeRedisOperation(
        () => pipeline.exec().then(() => true),
        false
      );

      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }
  
}

export const cacheService = new CacheService();