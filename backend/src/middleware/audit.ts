// src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export const auditLog = (action: string, entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send
    const originalSend = res.send;

    res.send = function (data: any) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || req.body?.id || null;
        
        prisma.auditLog
          .create({
            data: {
              userId: req.user!.userId,
              action,
              entity,
              entityId,
              details: {
                method: req.method,
                path: req.path,
                body: sanitizeAuditData(req.body),
                query: req.query,
              },
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.get('user-agent') || null,
            },
          })
          .catch((err) => {
            logger.error('Audit log failed:', err);
          });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

// Remove sensitive data from audit logs
const sanitizeAuditData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};