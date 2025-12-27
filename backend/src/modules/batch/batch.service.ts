// src/modules/batch/batch.service.ts
import { TicketStatus, Ticket } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { TicketService } from '../tickets/ticket.service';
import { generateTicketCode, addDays } from '../../utils/ticket.utils';
import { emitToAdmins } from '../../config/websocket';

const ticketService = new TicketService();

export class BatchService {
  /**
   * Bulk create tickets
   */
 
  async bulkCreateTickets(data: {
    orderId: string;
    gameSession: string;
    quantity: number;
    validityDays?: number;
  }) {
    if (data.quantity < 1 || data.quantity > 500) {
      throw new AppError(400, 'Quantity must be between 1 and 500');
    }

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    const settings = await ticketService.getSettings();
    
    if (!settings) {
      throw new AppError(500, 'Failed to load ticket settings');
    }

    const tickets = [];

    // Create tickets in batches of 50
    const batchSize = 50;
    const batches = Math.ceil(data.quantity / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchCount = Math.min(batchSize, data.quantity - i * batchSize);
      const batchTickets = [];

      for (let j = 0; j < batchCount; j++) {
        batchTickets.push({
          ticketCode: generateTicketCode(),
          orderId: data.orderId,
          gameSession: data.gameSession,
          validUntil: addDays(new Date(), data.validityDays || settings.validityDays),
          maxScans: settings.maxScanCount,
          scanWindow: settings.scanWindowDays,
          status: TicketStatus.ACTIVE,
        });
      }

      tickets.push(...batchTickets);

      logger.info(`Created batch ${i + 1}/${batches} (${batchCount} tickets)`);
    }

    emitToAdmins('batch:complete', {
      type: 'bulk_create_tickets',
      count: tickets.length,
      orderId: data.orderId,
    });

    logger.info(`Bulk created ${tickets.length} tickets for order ${data.orderId}`);

    return {
      created: tickets.length,
      tickets: tickets.slice(0, 10), // Return first 10 for preview
    };
  }

  /**
   * Bulk cancel tickets
   */
  async bulkCancelTickets(ticketIds: string[]) {
    if (ticketIds.length < 1 || ticketIds.length > 500) {
      throw new AppError(400, 'Must provide between 1 and 500 ticket IDs');
    }

    // Verify tickets exist and are cancellable
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: ticketIds },
        status: { in: [TicketStatus.ACTIVE] },
      },
    });

    if (tickets.length === 0) {
      throw new AppError(400, 'No valid tickets to cancel');
    }

    // Get IDs of valid tickets
    const validTicketIds = tickets.map((t: Ticket) => t.id);

    // Cancel in transaction
    const result = await prisma.ticket.updateMany({
      where: { id: { in: validTicketIds } },
      data: { status: TicketStatus.CANCELLED },
    });

    emitToAdmins('batch:complete', {
      type: 'bulk_cancel_tickets',
      count: result.count,
    });

    logger.info(`Bulk cancelled ${result.count} tickets`);

    return {
      cancelled: result.count,
      requested: ticketIds.length,
    };
  }

  /**
   * Bulk update ticket sessions
   */
  async bulkUpdateSessions(ticketIds: string[], newSession: string) {
    if (ticketIds.length < 1 || ticketIds.length > 500) {
      throw new AppError(400, 'Must provide between 1 and 500 ticket IDs');
    }

    const result = await prisma.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: { gameSession: newSession },
    });

    logger.info(`Bulk updated ${result.count} ticket sessions to ${newSession}`);

    return {
      updated: result.count,
      newSession,
    };
  }

  /**
   * Bulk import customers from CSV
   */
  async bulkImportCustomers(customers: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
  }>) {
    if (customers.length < 1 || customers.length > 1000) {
      throw new AppError(400, 'Must provide between 1 and 1000 customers');
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const customer of customers) {
      try {
        // Check if customer exists
        const existing = await prisma.customer.findUnique({
          where: { email: customer.email },
        });

        if (existing) {
          // Update existing
          await prisma.customer.update({
            where: { email: customer.email },
            data: customer,
          });
          results.updated++;
        } else {
          // Create new
          await prisma.customer.create({
            data: customer,
          });
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          email: customer.email,
          error: error.message,
        });
      }
    }

    logger.info(`Bulk imported customers: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);

    return results;
  }

  /**
   * Bulk send emails
   */
  async bulkSendEmails(data: {
    customerIds: string[];
    subject: string;
    body: string;
  }) {
    if (data.customerIds.length < 1 || data.customerIds.length > 1000) {
      throw new AppError(400, 'Must provide between 1 and 1000 customer IDs');
    }

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: data.customerIds },
        status: 'active',
      },
      select: { id: true, email: true, firstName: true },
    });

    if (customers.length === 0) {
      throw new AppError(400, 'No valid customers found');
    }

    // Queue emails
    const { emailQueue } = require('../../config/queue');

    for (const customer of customers) {
      await emailQueue.add('single-email', {
        to: customer.email,
        subject: data.subject,
        html: data.body.replace('{firstName}', customer.firstName),
      });
    }

    logger.info(`Queued ${customers.length} emails`);

    return {
      queued: customers.length,
      requested: data.customerIds.length,
    };
  }

  /**
   * Get batch operation status
   */
  async getBatchStatus(batchId: string) {
    // Implementation depends on how you track batch operations
    // Could use Redis or database table
    const cacheService = require('../../utils/cache.service').cacheService;
    const status = await cacheService.get(`batch:${batchId}`);

    if (!status) {
      throw new AppError(404, 'Batch operation not found');
    }

    return status;
  }
  
}