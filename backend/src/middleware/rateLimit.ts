// src/middleware/rateLimit.ts - FIXED VERSION
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limiter error:', err);
});

redisClient.on('connect', () => {
  logger.info('Rate limiter Redis connected');
});

// Connect Redis client
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

// Create Redis store
const createRedisStore = (prefix: string) => {
  return new RedisStore({
    client: redisClient,
    prefix: `rl:${prefix}:`,
  });
};

// General API rate limit
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  skip: (req) => {
    // Skip rate limiting for health checks
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

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes',
    });
  },
});

// Email sending rate limit
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Email sending limit reached',
  store: createRedisStore('email'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Order creation rate limit
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Order creation limit reached',
  store: createRedisStore('order'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Payment rate limit (critical - prevent abuse)
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Payment request limit reached',
  store: createRedisStore('payment'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Ticket scanning rate limit
export const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Scanning too fast, please slow down',
  store: createRedisStore('scan'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Export rate limit
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Increased from 1 to 2 to allow retry
  message: 'Please wait before requesting another export',
  store: createRedisStore('export'),
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Graceful shutdown
export const closeRateLimiter = async () => {
  try {
    await redisClient.quit();
    logger.info('Rate limiter Redis disconnected');
  } catch (error) {
    logger.error('Error closing rate limiter Redis:', error);
  }
};