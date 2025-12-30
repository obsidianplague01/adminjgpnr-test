// src/utils/audit.ts
import prisma from '../config/database';
import { logger } from './logger';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Customer Management
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  CUSTOMER_DEACTIVATED = 'CUSTOMER_DEACTIVATED',  // ✅ ADDED
  CUSTOMER_ACTIVATED = 'CUSTOMER_ACTIVATED',      // ✅ ADDED
  CUSTOMER_DOCUMENT_UPLOADED = 'CUSTOMER_DOCUMENT_UPLOADED',
  CUSTOMER_DOCUMENT_DELETED = 'CUSTOMER_DOCUMENT_DELETED',
  
  // Order Management
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  
  // Ticket Management
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_SCANNED = 'TICKET_SCANNED',
  TICKET_CANCELLED = 'TICKET_CANCELLED',
  TICKET_REACTIVATED = 'TICKET_REACTIVATED',
  TICKET_EXTENDED = 'TICKET_EXTENDED',
  TICKET_SCAN_REJECTED = 'TICKET_SCAN_REJECTED',
  TICKET_EMAIL_RESENT = 'TICKET_EMAIL_RESENT',
  
  // Payment
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_WEBHOOK_RECEIVED = 'PAYMENT_WEBHOOK_RECEIVED',
  
  // Campaign Management
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED = 'CAMPAIGN_UPDATED',
  CAMPAIGN_SENT = 'CAMPAIGN_SENT',
  CAMPAIGN_DELETED = 'CAMPAIGN_DELETED',
  
  // System
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  BULK_OPERATION = 'BULK_OPERATION',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
}

export enum AuditEntity {
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  ORDER = 'ORDER',
  TICKET = 'TICKET',
  PAYMENT = 'PAYMENT',
  CAMPAIGN = 'CAMPAIGN',
  SESSION = 'SESSION',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
}

// ✅ EXPORT the AuditContext interface
export interface AuditContext {
  userId?: string;
  email?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface AuditLogParams {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details?: any;
  context: AuditContext;
  success?: boolean;
  errorMessage?: string;
}

export class AuditLogger {
  /**
   * Create audit log entry
   */
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.context.userId || 'system',
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          details: params.details || {},
          ipAddress: params.context.ipAddress,
          userAgent: params.context.userAgent,
          success: params.success ?? true,
          errorMessage: params.errorMessage,
        },
      });

      logger.info(`Audit: ${params.action}`, {
        entity: params.entity,
        entityId: params.entityId,
        userId: params.context.userId,
        success: params.success,
      });
    } catch (error) {
      // Never let audit logging break the main operation
      logger.error('Failed to create audit log', {
        error,
        action: params.action,
        entity: params.entity,
      });
    }
  }

  /**
   * Extract context from Express request
   */
  static getContextFromRequest(req: any): AuditContext {
    return {
      userId: req.user?.userId,
      email: req.user?.email,
      role: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      sessionId: req.sessionID,
    };
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    action: AuditAction,
    context: AuditContext,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      action,
      entity: AuditEntity.AUTH,
      context,
      success,
      errorMessage,
    });
  }

  static async logDataAccess(
    entity: AuditEntity,
    entityId: string,
    action: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      action: action as AuditAction,
      entity,
      entityId,
      context,
    });
  }

  static async logBulkOperation(
    entity: AuditEntity,
    action: string,
    count: number,
    context: AuditContext,
    details?: any
  ): Promise<void> {
    await this.log({
      action: AuditAction.BULK_OPERATION,
      entity,
      details: {
        operation: action,
        count,
        ...details,
      },
      context,
    });
  }

  static async logSettingsChange(
    settingsType: string,
    changes: any,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      action: AuditAction.SETTINGS_CHANGED,
      entity: AuditEntity.SETTINGS,
      details: {
        settingsType,
        changes,
      },
      context,
    });
  }

  static async logDataExport(
    entity: AuditEntity,
    exportType: string,
    recordCount: number,
    context: AuditContext,
    details?: any
  ): Promise<void> {
    await this.log({
      action: AuditAction.DATA_EXPORT,
      entity,
      details: {
        exportType,
        recordCount,
        ...details,
      },
      context,
    });
  }

  static async logFailure(
    action: AuditAction,
    entity: AuditEntity,
    errorMessage: string,
    context: AuditContext,
    details?: any
  ): Promise<void> {
    await this.log({
      action,
      entity,
      context,
      success: false,
      errorMessage,
      details,
    });
  }

  static async query(filters: {
    userId?: string;
    action?: AuditAction;
    entity?: AuditEntity;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.success !== undefined) where.success = filters.success;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  static async getStats(filters: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [
      total,
      successful,
      failed,
      byAction,
      byEntity,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, success: true } }),
      prisma.auditLog.count({ where: { ...where, success: false } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
      }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : '0',
      byAction: byAction.map(a => ({
        action: a.action,
        count: a._count,
      })),
      byEntity: byEntity.map(e => ({
        entity: e.entity,
        count: e._count,
      })),
    };
  }

  static async getUserActivity(userId: string, limit: number = 20) {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Get entity history (all changes to a specific entity)
   */
  static async getEntityHistory(
    entity: AuditEntity,
    entityId: string,
    limit: number = 50
  ) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return logs;
  }

  static async getSecurityEvents(filters: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {
      OR: [
        { action: AuditAction.LOGIN_FAILED },
        { action: AuditAction.PASSWORD_CHANGED },
        { action: AuditAction.PASSWORD_RESET },
        { action: AuditAction.SESSION_TERMINATED },
        { success: false },
      ],
    };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return logs;
  }

  /**
   * Clean up old audit logs (for maintenance)
   * Keep logs for specified number of days
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        // ✅ Never delete security-related logs
        action: {
          notIn: [
            AuditAction.LOGIN_FAILED,
            AuditAction.PASSWORD_CHANGED,
            AuditAction.PASSWORD_RESET,
            AuditAction.USER_DELETED,
            AuditAction.CUSTOMER_DELETED,
          ],
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old audit logs`, {
      cutoffDate: cutoffDate.toISOString(),
      daysToKeep,
    });

    return result.count;
  }
}