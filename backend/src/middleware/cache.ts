// src/middleware/cache.ts
import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../utils/cache.service';
import { logger } from '../utils/logger';

const CACHE_TTL = 300; // 5 minutes default
const MAX_KEY_LENGTH = 250;

interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

/**
 * Validate cache key
 */
const validateCacheKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  if (key.length > MAX_KEY_LENGTH) {
    return false;
  }
  
  // Ensure key doesn't contain invalid characters
  const invalidChars = /[\s\n\r\t]/;
  if (invalidChars.test(key)) {
    return false;
  }
  
  return true;
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, prefix?: string): string => {
  const baseKey = prefix || `api:${req.path}`;
  
  // Include query parameters in key
  const queryKeys = Object.keys(req.query).sort();
  if (queryKeys.length > 0) {
    const queryString = queryKeys
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
    return `${baseKey}?${queryString}`;
  }
  
  return baseKey;
};

/**
 * Cache middleware - FIXED: Accept both number and options object
 */
export const cache = (options?: number | CacheOptions) => {
  // Handle both old API (number) and new API (object)
  const ttl = typeof options === 'number' ? options : (options?.ttl || CACHE_TTL);
  const prefix = typeof options === 'object' ? options.prefix : undefined;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req, prefix);

    if (!validateCacheKey(cacheKey)) {
      logger.warn(`Invalid cache key generated: ${cacheKey.substring(0, 100)}`);
      return next();
    }

    try {
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        
        res.setHeader('X-Cache', 'HIT');
        
        return res.json({
          ...cachedData,
          _cached: true,
          _cachedAt: new Date().toISOString(),
        });
      }

      logger.debug(`Cache miss: ${cacheKey}`);
      res.setHeader('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch((error) => {
            logger.error(`Failed to cache response for ${cacheKey}:`, error);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${cacheKey}:`, error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = async (pattern: string): Promise<void> => {
  if (!validateCacheKey(pattern)) {
    logger.warn(`Invalid cache pattern: ${pattern}`);
    return;
  }

  try {
    await cacheService.deletePattern(pattern);
    logger.debug(`Cache invalidated: ${pattern}`);
  } catch (error) {
    logger.error(`Failed to invalidate cache ${pattern}:`, error);
    throw error;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    await cacheService.flush();
    logger.info('All cache cleared');
  } catch (error) {
    logger.error('Failed to clear all cache:', error);
    throw error;
  }
};

/**
 * Cache warming middleware - preload common queries
 */
export const warmCache = async () => {
  try {
    logger.info('Starting cache warming...');
    
    // Add your cache warming logic here
    // Example: Preload frequently accessed data
    
    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Cache warming failed:', error);
  }
};