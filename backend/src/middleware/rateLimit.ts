// src/middleware/rateLimit.ts
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

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
// General API rate limit
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = req.rateLimit?.resetTime || new Date();
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: resetTime,
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
});

// Email sending rate limit
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Email sending limit reached',
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Order creation rate limit
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Order creation limit reached',
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Export rate limit
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: 'Please wait before requesting another export',
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});