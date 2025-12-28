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
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  
  // Customer Management
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  CUSTOMER_DOCUMENT_UPLOADED = 'CUSTOMER_DOCUMENT_UPLOADED',
  CUSTOMER_DOCUMENT_DELETED = 'CUSTOMER_DOCUMENT_DELETED',
  
  // Order Management
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  
  // Ticket Management
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_SCANNED = 'TICKET_SCANNED',
  TICKET_CANCELLED = 'TICKET_CANCELLED',
  TICKET_SCAN_REJECTED = 'TICKET_SCAN_REJECTED',
  
  // Payment
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  
  // System
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  BULK_OPERATION = 'BULK_OPERATION',
  DATA_EXPORT = 'DATA_EXPORT',
}

export enum AuditEntity {
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  ORDER = 'ORDER',
  TICKET = 'TICKET',
  PAYMENT = 'PAYMENT',
  SESSION = 'SESSION',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
}

interface AuditContext {
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
 
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.context.userId,
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

  /**
   * Log data access events
   */
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

  /**
   * Log bulk operations
   */
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
}