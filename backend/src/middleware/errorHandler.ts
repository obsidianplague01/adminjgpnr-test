// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string;
  logger.error('Error occurred:', {
    requestId,
    error: err.message,
    stack: err.stack, 
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      requestId,
    });
  }
  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred'
    : err.message;
    
  return res.status(500).json({ error: message, requestId  });
};
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
};

// Async wrapper to catch errors in async route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};