// src/middleware/validate.ts - IMPROVED SANITIZATION
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';
import DOMPurify from 'isomorphic-dompurify'; // Add this package

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        logger.warn('Validation error:', { 
          errors, 
          path: req.path,
          method: req.method,
        });
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
      logger.error('Unexpected validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Enhanced sanitization using DOMPurify
export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  // Use DOMPurify for HTML sanitization
  const cleaned = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
    KEEP_CONTENT: true, // Keep text content
  });
  
  return cleaned.trim();
};

// Sanitize object recursively
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also sanitize keys to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      if (!['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Apply sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(req.query);
  }
  // Don't sanitize params as they're usually IDs validated by schemas
  next();
};