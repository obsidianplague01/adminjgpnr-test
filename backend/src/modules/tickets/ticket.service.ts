// src/modules/tickets/ticket.service.ts
import { TicketStatus } from '@prisma/client';
import prisma from '../../config/database';
import { monitoring } from '../../utils/monitoring.service';
import { AppError } from '../../middleware/errorHandler';
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

export class TicketService {
  async createTickets(data: CreateTicketInput) {
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

    logger.info(`Created ${quantity} tickets for order ${data.orderId}`);
    return tickets;
  }

  async listTickets(filters: ListTicketsInput) {
    // Implementation from previous artifact
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

  async updateTicket(ticketId: string, data: UpdateTicketInput) {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
    });

    logger.info(`Ticket updated: ${ticket.ticketCode}`);
    return ticket;
  }

  async cancelTicket(ticketId: string) {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CANCELLED },
    });

    logger.info(`Ticket cancelled: ${ticket.ticketCode}`);
    return ticket;
  }

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

  async scanTicket(data: ScanTicketInput) {
    const validation = await this.validateTicket({
      ticketCode: data.ticketCode,
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

      logger.info(`Ticket scanned: ${data.ticketCode} by ${data.scannedBy}`);
    } else {
      logger.warn(`Scan denied: ${data.ticketCode} - ${validation.reason}`);
    }
    const start = Date.now();
  
    try {
      const result = await this.validateTicket({ ticketCode: data.ticketCode });
      
      monitoring.addBreadcrumb('Ticket scanned', {
        ticketCode: data.ticketCode,
        valid: result.valid,
      });
      
      monitoring.trackPerformance('scanTicket', Date.now() - start);
      
      return result;
    } catch (error) {
      monitoring.captureException(error as Error, {
        operation: 'scanTicket',
        ticketCode: data.ticketCode,
      });
      throw error;
    }
    return {
      ...validation,
      scanId: scanRecord.id,
      scannedAt: scanRecord.scannedAt,
    };
  }

  async getScanHistory(_filters: { ticketId?: string; limit?: number }) {
    const where: any = {};
    if (_filters.ticketId) {
      where.ticketId = _filters.ticketId;
    }

    const scans = await prisma.ticketScan.findMany({
      where,
      take: _filters.limit || 100,
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

  async updateSettings(data: UpdateSettingsInput) {
    const settings = await prisma.ticketSettings.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        ...data,
      },
    });

    logger.info('Ticket settings updated');
    return settings;
  }
}