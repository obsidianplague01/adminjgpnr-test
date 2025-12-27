import { Request, Response, NextFunction } from 'express';
import redis from '../config/cache';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Cache middleware for GET requests
 */
export const cache = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    prefix = 'api',
    keyGenerator,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `${prefix}:${req.path}:${JSON.stringify(req.query)}:${req.user?.userId || 'anonymous'}`;

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedData));
      }

      logger.debug(`Cache MISS: ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        // Cache the response
        redis.setex(cacheKey, ttl, JSON.stringify(data)).catch((err) => {
          logger.error('Cache set error:', err);
        });

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without cache on error
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

/**
 * Invalidate all cache
 */
export const invalidateAllCache = async () => {
  try {
    await redis.flushdb();
    logger.info('All cache invalidated');
  } catch (error) {
    logger.error('Cache flush error:', error);
  }
};