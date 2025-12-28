// src/modules/tickets/ticket.service.ts
import { TicketStatus } from '@prisma/client';
import prisma from '../../config/database';
import { monitoring } from '../../utils/monitoring.service';
import { AppError } from '../../middleware/errorHandler';
import { AuditLogger, AuditAction, AuditEntity, AuditContext } from '../../utils/audit';
import crypto from 'crypto';
import {
  CreateTicketInput,
  UpdateTicketInput,
  ScanTicketInput,
  ValidateTicketInput,
  ListTicketsInput,
  UpdateSettingsInput,
} from './ticket.schema';
import {
  generateTicketCode,
  generateQRCode,
  daysBetween,
  addDays,
  isTicketExpired,
} from '../../utils/ticket.utils';
import { logger } from '../../utils/logger';

function generateSecureCode(length: number, charset: string): string {
  const result: string[] = [];
  const randomBytes = crypto.randomBytes(length * 2);
  
  let cursor = 0;
  while (result.length < length && cursor < randomBytes.length) {
    const byte = randomBytes[cursor];
    if (byte < charset.length * Math.floor(256 / charset.length)) {
      result.push(charset[byte % charset.length]);
    }
    cursor++;
  }
  
  return result.join('');
}

export class TicketService {
  /**
   * Create tickets
   */
  async createTickets(data: CreateTicketInput, context: AuditContext) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    const settings = await this.getSettings();
    const tickets = [];
    const quantity = data.quantity || 1;

    for (let i = 0; i < quantity; i++) {
      const ticketCode = generateTicketCode();
      const validUntil = addDays(
        new Date(),
        data.validityDays || settings.validityDays
      );

      const ticket = await prisma.ticket.create({
        data: {
          ticketCode,
          orderId: data.orderId,
          gameSession: data.gameSession,
          validUntil,
          maxScans: settings.maxScanCount,
          scanWindow: settings.scanWindowDays,
          status: TicketStatus.ACTIVE,
        },
      });

      try {
        const qrPath = await generateQRCode(ticketCode, {
          orderId: order.id,
          customerId: order.customerId,
          gameSession: data.gameSession,
          validUntil,
        });

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCodePath: qrPath },
        });
      } catch (error) {
        logger.error('QR generation failed for ticket:', ticket.id, error);
      }

      tickets.push(ticket);
    }

    // ✅ Audit bulk ticket creation
    await AuditLogger.logBulkOperation(
      AuditEntity.TICKET,
      'TICKETS_CREATED',
      quantity,
      context,
      {
        orderId: data.orderId,
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email,
        ticketCodes: tickets.map(t => t.ticketCode),
        gameSession: data.gameSession,
        validityDays: data.validityDays || settings.validityDays,
      }
    );

    logger.info(`Created ${quantity} tickets for order ${data.orderId}`, {
      orderId: data.orderId,
      quantity,
      createdBy: context.userId,
    });

    return tickets;
  }

  /**
   * List tickets with filters
   */
  async listTickets(filters: ListTicketsInput) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.gameSession) where.gameSession = { contains: filters.gameSession, mode: 'insensitive' };
    if (filters.search) where.ticketCode = { contains: filters.search, mode: 'insensitive' };
    if (filters.orderId) where.orderId = filters.orderId;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        scanHistory: {
          orderBy: { scannedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }

    return ticket;
  }

  /**
   * Get ticket by code
   */
  async getTicketByCode(ticketCode: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        scanHistory: {
          orderBy: { scannedAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }

    return ticket;
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, data: UpdateTicketInput, context: AuditContext) {
    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { include: { customer: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'Ticket not found');
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
    });

    // ✅ Track changes
    const changes: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (existing[key as keyof typeof existing] !== value) {
        changes[key] = {
          from: existing[key as keyof typeof existing],
          to: value,
        };
      }
    }

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.TICKET_CREATED, // Reusing action
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      details: {
        ticketCode: ticket.ticketCode,
        action: 'TICKET_UPDATED',
        customerEmail: existing.order.customer.email,
        changes,
      },
      context,
    });

    logger.info(`Ticket updated: ${ticket.ticketCode}`, {
      ticketId,
      updatedBy: context.userId,
      changedFields: Object.keys(changes),
    });

    return ticket;
  }

  /**
   * Cancel ticket
   */
  async cancelTicket(id: string, reason: string, context: AuditContext) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    });

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }

    if (ticket.status === 'CANCELLED') {
      throw new AppError(400, 'Ticket already cancelled');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        notes: `Cancelled: ${reason}`,
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.TICKET_CANCELLED,
      entity: AuditEntity.TICKET,
      entityId: id,
      details: {
        ticketCode: ticket.ticketCode,
        orderId: ticket.orderId,
        orderNumber: ticket.order.orderNumber,
        customerEmail: ticket.order.customer.email,
        reason,
        previousStatus: ticket.status,
      },
      context,
    });

    logger.info('Ticket cancelled', {
      ticketId: id,
      ticketCode: ticket.ticketCode,
      cancelledBy: context.userId,
      reason,
    });

    return updated;
  }

  /**
   * Validate ticket
   */
  async validateTicket(data: ValidateTicketInput) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: data.ticketCode },
    });

    if (!ticket) {
      return {
        valid: false,
        reason: 'Ticket not found',
        ticket: null,
      };
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      return {
        valid: false,
        reason: 'Ticket has been cancelled',
        ticket,
      };
    }

    if (ticket.status === TicketStatus.EXPIRED) {
      return {
        valid: false,
        reason: 'Ticket has expired',
        ticket,
      };
    }

    if (isTicketExpired(ticket.validUntil)) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.EXPIRED },
      });

      return {
        valid: false,
        reason: 'Ticket validity period has expired',
        ticket,
      };
    }

    if (ticket.scanCount >= ticket.maxScans) {
      return {
        valid: false,
        reason: `Maximum scan limit (${ticket.maxScans}) reached`,
        ticket,
      };
    }

    if (ticket.firstScanAt && ticket.scanCount > 0) {
      const daysSinceFirst = daysBetween(ticket.firstScanAt, new Date());
      
      if (daysSinceFirst > ticket.scanWindow) {
        return {
          valid: false,
          reason: `Scan window of ${ticket.scanWindow} days has expired`,
          ticket,
        };
      }

      const remainingDays = ticket.scanWindow - daysSinceFirst;
      return {
        valid: true,
        reason: `Valid (${remainingDays} days remaining in scan window)`,
        ticket,
        remainingScans: ticket.maxScans - ticket.scanCount,
        remainingDays,
      };
    }

    return {
      valid: true,
      reason: 'Valid (first scan)',
      ticket,
      remainingScans: ticket.maxScans - ticket.scanCount,
    };
  }

  /**
   * Scan ticket
   */
  async scanTicket(data: ScanTicketInput, context: AuditContext) {
    const start = Date.now();
    
    monitoring.addBreadcrumb('Ticket scanned', {
      ticketCode: data.ticketCode,
    });

    try {
      const validation = await this.validateTicket({
        ticketCode: data.ticketCode,
      });

      // Get full ticket data for audit
      const ticket = await prisma.ticket.findUnique({
        where: { ticketCode: data.ticketCode },
        include: {
          order: { include: { customer: true } },
        },
      });

      const scanRecord = await prisma.ticketScan.create({
        data: {
          ticketId: validation.ticket!.id,
          scannedBy: data.scannedBy,
          location: data.location,
          allowed: validation.valid,
          reason: validation.reason,
        },
      });

      if (validation.valid) {
        const updateData: any = {
          scanCount: { increment: 1 },
          lastScanAt: new Date(),
        };

        if (!validation.ticket!.firstScanAt) {
          updateData.firstScanAt = new Date();
        }

        if (validation.ticket!.scanCount + 1 >= validation.ticket!.maxScans) {
          updateData.status = TicketStatus.SCANNED;
        }

        await prisma.ticket.update({
          where: { id: validation.ticket!.id },
          data: updateData,
        });

        // ✅ Audit successful scan
        await AuditLogger.log({
          action: AuditAction.TICKET_SCANNED,
          entity: AuditEntity.TICKET,
          entityId: validation.ticket!.id,
          details: {
            ticketCode: data.ticketCode,
            scanCount: validation.ticket!.scanCount + 1,
            maxScans: validation.ticket!.maxScans,
            location: data.location,
            orderId: ticket?.orderId,
            orderNumber: ticket?.order.orderNumber,
            customerEmail: ticket?.order.customer.email,
          },
          context,
        });

        logger.info(`Ticket scanned: ${data.ticketCode}`, {
          ticketCode: data.ticketCode,
          scannedBy: data.scannedBy,
          scanCount: validation.ticket!.scanCount + 1,
        });
      } else {
        // ✅ Audit rejected scan
        await AuditLogger.log({
          action: AuditAction.TICKET_SCAN_REJECTED,
          entity: AuditEntity.TICKET,
          entityId: validation.ticket?.id,
          details: {
            ticketCode: data.ticketCode,
            reason: validation.reason,
            location: data.location,
            orderId: ticket?.orderId,
            orderNumber: ticket?.order.orderNumber,
            customerEmail: ticket?.order.customer.email,
          },
          context,
          success: false,
          errorMessage: validation.reason,
        });

        logger.warn(`Scan denied: ${data.ticketCode} - ${validation.reason}`, {
          ticketCode: data.ticketCode,
          scannedBy: data.scannedBy,
          reason: validation.reason,
        });
      }

      monitoring.trackPerformance('scanTicket', Date.now() - start);

      return {
        ...validation,
        scanId: scanRecord.id,
        scannedAt: scanRecord.scannedAt,
      };
    } catch (error) {
      monitoring.captureException(error as Error, {
        operation: 'scanTicket',
        ticketCode: data.ticketCode,
      });
      throw error;
    }
  }

  /**
   * Get scan history
   */
  async getScanHistory(filters: { ticketId?: string; limit?: number }) {
    const where: any = {};
    if (filters.ticketId) {
      where.ticketId = filters.ticketId;
    }

    const scans = await prisma.ticketScan.findMany({
      where,
      take: filters.limit || 100,
      orderBy: { scannedAt: 'desc' },
      include: {
        ticket: {
          select: {
            ticketCode: true,
            gameSession: true,
          },
        },
      },
    });

    return scans;
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats() {
    const [total, active, scanned, cancelled, expired] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: TicketStatus.ACTIVE } }),
      prisma.ticket.count({ where: { status: TicketStatus.SCANNED } }),
      prisma.ticket.count({ where: { status: TicketStatus.CANCELLED } }),
      prisma.ticket.count({ where: { status: TicketStatus.EXPIRED } }),
    ]);

    const scanRate = total > 0 ? ((scanned / total) * 100).toFixed(2) : '0.00';

    return {
      total,
      active,
      scanned,
      cancelled,
      expired,
      scanRate: parseFloat(scanRate),
    };
  }

  /**
   * Get ticket settings
   */
  async getSettings() {
    let settings = await prisma.ticketSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.ticketSettings.create({
        data: {
          id: 1,
          maxScanCount: 2,
          scanWindowDays: 14,
          validityDays: 30,
          basePrice: 2500,
        },
      });
    }

    return settings;
  }

  /**
   * Update ticket settings
   */
  async updateSettings(data: UpdateSettingsInput, context: AuditContext) {
    const existing = await this.getSettings();

    const settings = await prisma.ticketSettings.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        ...data,
      },
    });

    // ✅ Track changes
    const changes: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (existing[key as keyof typeof existing] !== value) {
        changes[key] = {
          from: existing[key as keyof typeof existing],
          to: value,
        };
      }
    }

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.SETTINGS_CHANGED,
      entity: AuditEntity.SETTINGS,
      entityId: '1',
      details: {
        settingsType: 'TICKET_SETTINGS',
        changes,
      },
      context,
    });

    logger.info('Ticket settings updated', {
      updatedBy: context.userId,
      changedFields: Object.keys(changes),
    });

    return settings;
  }
}