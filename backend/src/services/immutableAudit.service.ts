// backend/src/services/immutableAudit.service.ts
import prisma from '../config/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    from?: any;
    to?: any;
  };
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

class ImmutableAuditService {
  /**
   * Generate cryptographic hash of audit data
   * Ensures data integrity and immutability
   */
  private generateHash(data: string, previousHash?: string): string {
    const content = previousHash ? `${previousHash}${data}` : data;
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Get the latest audit log hash for chain verification
   */
  private async getLastAuditHash(): Promise<string | null> {
    try {
      const lastLog = await prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, action: true },
      });

      if (!lastLog) return null;

      // Create hash from last log data
      return this.generateHash(
        JSON.stringify({
          id: lastLog.id,
          action: lastLog.action,
          createdAt: lastLog.createdAt,
        })
      );
    } catch (error) {
      logger.error('Failed to get last audit hash:', error);
      return null;
    }
  }

  /**
   * Create an immutable audit log entry
   * Uses blockchain-like chaining for integrity
   */
  async createLog(data: AuditLogData): Promise<void> {
    try {
      // Get previous hash for chaining
      const previousHash = await this.getLastAuditHash();

      // Create hash of current data
      const dataString = JSON.stringify({
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        timestamp: new Date().toISOString(),
        metadata: data.metadata,
      });

      const currentHash = this.generateHash(dataString, previousHash || undefined);

      // Store audit log with hash
      await prisma.auditLog.create({
        data: {
          userId: data.userId || 'system',
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          details: {
            changes: data.changes,
            metadata: data.metadata,
            hash: currentHash,
            previousHash: previousHash,
            success: data.success ?? true,
            errorMessage: data.errorMessage,
          },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
        },
      });

      logger.debug('Immutable audit log created', {
        action: data.action,
        entity: data.entity,
        hash: currentHash.substring(0, 16),
      });
    } catch (error) {
      // CRITICAL: Audit logging failure should not break main operations
      logger.error('Failed to create immutable audit log:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: data.action,
        entity: data.entity,
      });

      // Try to log to file as fallback
      try {
        logger.warn('AUDIT_FAILURE', {
          data,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      } catch (fallbackError) {
        // Last resort: console log
        console.error('CRITICAL: Audit logging completely failed', data);
      }
    }
  }

  /**
   * Verify audit log chain integrity
   * Ensures no tampering has occurred
   */
  async verifyChainIntegrity(limit: number = 100): Promise<{
    valid: boolean;
    checkedCount: number;
    errors: string[];
  }> {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          createdAt: true,
        },
      });

      const errors: string[] = [];
      let previousHash: string | null = null;

      // Check in reverse order (oldest to newest)
      for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        const details = log.details as any;

        if (!details || typeof details !== 'object') {
          errors.push(`Log ${log.id}: Missing or invalid details`);
          continue;
        }

        const { hash, previousHash: storedPreviousHash } = details;

        if (!hash) {
          errors.push(`Log ${log.id}: Missing hash`);
          continue;
        }

        // Verify previous hash matches
        if (previousHash && storedPreviousHash !== previousHash) {
          errors.push(
            `Log ${log.id}: Hash chain broken (expected ${previousHash}, got ${storedPreviousHash})`
          );
        }

        // Verify current hash
        const dataString = JSON.stringify({
          userId: (log as any).userId,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          timestamp: log.createdAt.toISOString(),
          metadata: details.metadata,
        });

        const computedHash = this.generateHash(
          dataString,
          storedPreviousHash || undefined
        );

        if (computedHash !== hash) {
          errors.push(`Log ${log.id}: Data tampering detected`);
        }

        previousHash = hash;
      }

      const valid = errors.length === 0;

      if (!valid) {
        logger.error('Audit chain integrity check failed', {
          errors,
          checkedCount: logs.length,
        });
      }

      return {
        valid,
        checkedCount: logs.length,
        errors,
      };
    } catch (error) {
      logger.error('Failed to verify audit chain:', error);
      return {
        valid: false,
        checkedCount: 0,
        errors: ['Verification process failed'],
      };
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entity: string,
    entityId: string,
    limit: number = 50
  ) {
    try {
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
    } catch (error) {
      logger.error('Failed to get entity audit trail:', error);
      return [];
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivity(userId: string, limit: number = 100) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get user activity:', error);
      return [];
    }
  }

  /**
   * Get security events (failed operations, unauthorized access attempts)
   */
  async getSecurityEvents(limit: number = 100) {
    try {
      const events = await prisma.auditLog.findMany({
        where: {
          OR: [
            { success: false },
            { action: { contains: 'FAILED' } },
            { action: { contains: 'UNAUTHORIZED' } },
            { action: { contains: 'REJECTED' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return events;
    } catch (error) {
      logger.error('Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    entity?: string
  ): Promise<any[]> {
    try {
      const where: any = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (entity) {
        where.entity = entity;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });

      return logs.map((log) => ({
        timestamp: log.createdAt.toISOString(),
        user: log.user?.email || 'system',
        role: log.user?.role || 'system',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        success: log.success,
        ipAddress: log.ipAddress,
        details: log.details,
      }));
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      return [];
    }
  }
}

export const immutableAuditService = new ImmutableAuditService();