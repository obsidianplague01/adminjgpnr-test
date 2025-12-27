// backend/src/utils/cache.service.ts
import redis from '../config/cache';
import prisma from '../config/database';
import { logger } from './logger';

export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes

  /**
   * Get cached value (with database fallback for analytics)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      const data = await redis.get(key);
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
          // Warm up Redis
          await redis.setex(key, this.DEFAULT_TTL, JSON.stringify(dbCache.data));
          return dbCache.data as T;
        }
      }

      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value (dual write to Redis and DB for analytics)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const effectiveTTL = ttl || this.DEFAULT_TTL;

      // Always write to Redis
      await redis.setex(key, effectiveTTL, serialized);

      // Write to DB for analytics (persistent cache)
      if (key.startsWith('analytics:')) {
        const expiresAt = new Date(Date.now() + effectiveTTL * 1000);
        
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
      }

      logger.debug(`Cache SET: ${key} (TTL: ${effectiveTTL}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);

      if (key.startsWith('analytics:')) {
        await prisma.analyticsCache.delete({
          where: { cacheKey: key },
        }).catch(() => {
          // Ignore if not found
        });
      }

      logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Delete by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }

      // Clean DB cache
      if (pattern.startsWith('analytics:')) {
        const likePattern = pattern.replace('*', '%');
        await prisma.$executeRawUnsafe(
          `DELETE FROM analytics_cache WHERE cache_key LIKE $1`,
          likePattern
        );
      }
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
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
    return await redis.incrby(key, amount);
  }

  /**
   * Set expiration
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redisKeys: number;
    dbCacheRecords: number;
    expiredRecords: number;
  }> {
    try {
      const [redisKeys, dbCache, expired] = await Promise.all([
        redis.dbsize(),
        prisma.analyticsCache.count(),
        prisma.analyticsCache.count({
          where: { expiresAt: { lt: new Date() } },
        }),
      ]);

      return {
        redisKeys,
        dbCacheRecords: dbCache,
        expiredRecords: expired,
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { redisKeys: 0, dbCacheRecords: 0, expiredRecords: 0 };
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
}

export const cacheService = new CacheService();