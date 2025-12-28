// src/utils/cache.service.ts - PRODUCTION-READY VERSION
import redis from '../config/cache';
import prisma from '../config/database';
import { logger } from './logger';

export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private isRedisHealthy = false;

  constructor() {
    this.initializeHealthCheck();
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthCheck() {
    // Check Redis health on startup
    this.checkRedisHealth();

    // Periodic health check every 30 seconds
    setInterval(() => {
      this.checkRedisHealth();
    }, 30000);
  }

  /**
   * Check Redis connection health
   */
  private async checkRedisHealth() {
    try {
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

  /**
   * Check if cache service is healthy
   */
  isHealthy(): boolean {
    return this.isRedisHealthy;
  }

  /**
   * Safe Redis operation wrapper
   */
  private async safeRedisOperation<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    if (!this.isRedisHealthy) {
      logger.warn('Redis unavailable, skipping cache operation');
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

  /**
   * Get cached value (with database fallback for analytics)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first (with safety wrapper)
      const data = await this.safeRedisOperation(
        () => redis.get(key),
        null
      );

      if (data) {
        logger.debug(`Cache HIT (Redis): ${key}`);
        return JSON.parse(data);
      }

      // Fallback to database cache for analytics
      if (key.startsWith('analytics:')) {
        const dbCache = await prisma.analyticsCache.findUnique({
          where: { 
            cacheKey: key,
            expiresAt: { gt: new Date() },
          },
        });

        if (dbCache) {
          logger.debug(`Cache HIT (DB): ${key}`);
          // Warm up Redis (non-blocking)
          if (this.isRedisHealthy) {
            this.safeRedisOperation(
              () => redis.setex(key, this.DEFAULT_TTL, JSON.stringify(dbCache.data)),
              undefined
            ).catch(() => {
              // Ignore warmup failures
            });
          }
          return dbCache.data as T;
        }
      }

      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value (dual write to Redis and DB for analytics)
   */
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

  /**
   * Delete cached value
   */
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

  /**
   * Delete by pattern
   */
  // backend/src/utils/cache.service.ts (Line ~220)

    async deletePattern(pattern: string): Promise<number> {
  try {
    let deletedCount = 0;

    // Delete from Redis
    if (this.isRedisHealthy) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount = keys.length;
          logger.info(`Invalidated ${keys.length} Redis keys matching: ${pattern}`);
        }
      } catch (error) {
        logger.error('Redis pattern delete error:', error);
      }
    }

    // Clean DB cache - FIXED: Use proper parameterized query
    if (pattern.startsWith('analytics:')) {
      try {
        const likePattern = pattern.replace('*', '%');
        
        // FIXED: Use $executeRaw with template syntax instead of $executeRawUnsafe
        const result = await prisma.$executeRaw`
          DELETE FROM "AnalyticsCache" WHERE "cacheKey" LIKE ${likePattern}
        `;
        
        logger.info(`Deleted ${result} DB cache entries matching: ${pattern}`);
      } catch (error) {
        logger.error('DB pattern delete error:', error);
      }
    }

    return deletedCount;
  } catch (error) {
    logger.error('Cache pattern delete error:', error);
    return 0;
  }
}

/**
 * Delete single key - FIXED: Added missing method
 */
async del(key: string): Promise<boolean> {
  return await this.delete(key);
}

/**
 * Flush all cache - FIXED: Added missing method
 */
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

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return await this.safeRedisOperation(
      () => redis.exists(key).then(result => result === 1),
      false
    );
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount = 1): Promise<number> {
    return await this.safeRedisOperation(
      () => redis.incrby(key, amount),
      0
    );
  }

  /**
   * Set expiration
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.safeRedisOperation(
      () => redis.expire(key, seconds).then(() => true),
      false
    );
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    return await this.safeRedisOperation(
      () => redis.ttl(key),
      -1
    );
  }

  /**
   * Get cache statistics
   */
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

  /**
   * Cleanup expired cache entries
   */
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

  /**
   * Generate cache key for analytics
   */
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

  /**
   * Invalidate all analytics cache
   */
  async invalidateAllAnalytics(): Promise<void> {
    await this.deletePattern('analytics:*');
    logger.info('All analytics cache invalidated');
  }

  /**
   * Flush all cache (use with caution)
   */
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

  /**
   * Get multiple keys at once
   */
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

  /**
   * Set multiple keys at once
   */
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