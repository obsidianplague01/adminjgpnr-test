import redis from '../config/cache';

export class CacheService {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Delete by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
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
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch data
    const data = await fetcher();

    // Store in cache
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
}

export const cacheService = new CacheService();