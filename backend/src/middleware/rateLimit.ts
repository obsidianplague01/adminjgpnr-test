// src/middleware/rateLimit.ts 
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import redis from '../config/cache';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limiter error:', err);
});

redisClient.on('connect', () => {
  logger.info('Rate limiter Redis connected');
});

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect rate limiter Redis:', error);
  }
})();

declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

const createRedisStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
};

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  
  max: 5,                    
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded: ${req.ip}`, {
      email: req.body.email,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
});

export const accountLockout = async (
  email: string,
  success: boolean
): Promise<{ locked: boolean; remainingAttempts?: number; unlockAt?: Date }> => {
  const key = `account:lockout:${email.toLowerCase()}`;
  
  if (success) {
    // Clear failed attempts on successful login
    await redis.del(key);
    return { locked: false };
  }

  // Increment failed attempts
  const attempts = await redis.incr(key);
  
  // Set expiry on first attempt
  if (attempts === 1) {
    await redis.expire(key, 3600); // 1 hour window
  }

  // Lock account after 10 failed attempts
  if (attempts >= 10) {
    const ttl = await redis.ttl(key);
    const unlockAt = new Date(Date.now() + ttl * 1000);
    
    logger.warn('Account locked due to failed login attempts', {
      email,
      attempts,
      unlockAt: unlockAt.toISOString(),
    });

    return {
      locked: true,
      remainingAttempts: 0,
      unlockAt,
    };
  }

  return {
    locked: false,
    remainingAttempts: 10 - attempts,
  };
};
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Email sending limit reached',
  store: createRedisStore('email'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Order creation limit reached',
  store: createRedisStore('order'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Payment request limit reached',
  store: createRedisStore('payment'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Scanning too fast, please slow down',
  store: createRedisStore('scan'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  message: 'Please wait before requesting another export',
  store: createRedisStore('export'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

export const closeRateLimiter = async () => {
  try {
    await redisClient.quit();
    logger.info('Rate limiter Redis disconnected');
  } catch (error) {
    logger.error('Error closing rate limiter Redis:', error);
  }
};
export const fileDownloadLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 30, 
  message: 'Too many file download requests',
  store: createRedisStore('file-download'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});