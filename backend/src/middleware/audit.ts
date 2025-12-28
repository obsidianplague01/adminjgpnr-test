// src/middleware/audit.ts 
import { Request, Response, NextFunction } from 'express';
import { AuditLogger, AuditContext } from '../utils/audit';
import { logger } from '../utils/logger';

export const extractAuditContext = (req: Request): AuditContext => {
  return {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  };
};

/**
 * Audit logging middleware factory
 * @param action - Audit action (e.g., 'CREATE_ORDER')
 * @param entity - Entity type (e.g., 'ORDER')
 */
export const auditLog = (action: string, entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send
    const originalSend = res.send;

    res.send = function (data: any) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const context = extractAuditContext(req);
        const entityId = req.params.id || req.body?.id || null;

        AuditLogger.log({
          action: action as any,
          entity: entity as any,
          entityId,
          details: {
            method: req.method,
            path: req.path,
            body: sanitizeAuditData(req.body),
            query: req.query,
          },
          context,
        }).catch((err) => {
          logger.error('Audit log failed:', err);
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

const sanitizeAuditData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'refreshToken',
    'accessToken',
    'twoFactorSecret',
    'twoFactorBackupCodes',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};