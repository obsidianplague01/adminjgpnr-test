// src/middleware/rateLimit.ts 
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import redis from '../config/cache';
import crypto from 'crypto';

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

import { MemoryStore } from 'express-rate-limit';

const createStore = (prefix: string) => {
  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  } catch (error) {
    logger.warn(`Redis unavailable for rate limiter, using memory store for ${prefix}`);
    return new MemoryStore();
  }
};


const createRedisStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
};

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: createStore('api'),
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
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
const getClientIdentifier = (req: Request): string => {
  const identifiers: string[] = [];
  
  const realIp = req.socket.remoteAddress || 'unknown';
  identifiers.push(realIp);
  
  const fingerprint = req.headers['x-client-fingerprint'] as string;
  if (fingerprint && /^[a-f0-9]{32}$/.test(fingerprint)) {
    identifiers.push(fingerprint);
  }
  const ua = req.headers['user-agent'];
  if (ua) {
    const uaHash = crypto.createHash('sha256').update(ua).digest('hex').substring(0, 8);
    identifiers.push(uaHash);
  }
  
  return identifiers.join(':');
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: getClientIdentifier,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      identifier: getClientIdentifier(req),
      ip: req.socket.remoteAddress,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
});
async function redisLockout(email: string, success: boolean) {
  const key = `lockout:${email}`;
  
  if (success) {
    await redis.del(key);
    return { locked: false };
  }
  
  const attempts = await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour
  
  if (attempts >= 10) {
    return {
      locked: true,
      remainingAttempts: 0,
      unlockAt: new Date(Date.now() + 3600000)
    };
  }
  
  return {
    locked: false,
    remainingAttempts: Math.max(0, 10 - attempts)
  };
}
export const accountLockout = async (
  email: string,
  success: boolean
): Promise<{ locked: boolean; remainingAttempts?: number; unlockAt?: Date }> => {
  try {
    // Try Redis first (fast path)
    return await redisLockout(email, success);
  } catch (error) {
    logger.warn('Redis lockout failed, using database fallback');
    return await databaseLockout(email, success);
  }
};

async function databaseLockout(email: string, success: boolean) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { loginAttempts: true, lockedUntil: true }
  });
  
  if (!user) return { locked: false };
  
  if (success) {
    await prisma.user.update({
      where: { email },
      data: { loginAttempts: 0, lockedUntil: null }
    });
    return { locked: false };
  }
  
  const attempts = (user.loginAttempts || 0) + 1;
  const lockedUntil = attempts >= 10 
    ? new Date(Date.now() + 3600000) 
    : null;
  
  await prisma.user.update({
    where: { email },
    data: { loginAttempts: attempts, lockedUntil }
  });
  
  return {
    locked: attempts >= 10,
    remainingAttempts: Math.max(0, 10 - attempts),
    unlockAt: lockedUntil || undefined
  };
}
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