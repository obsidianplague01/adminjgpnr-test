// src/modules/orders/order.service.ts
import { OrderStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { monitoring } from '../../utils/monitoring.service';
import {
  CreateOrderInput,
  UpdateOrderInput,
  ConfirmPaymentInput,
  ListOrdersInput,
} from './order.schema';
import { TicketService } from '../tickets/ticket.service';
import { emailQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import { invalidateCache } from '../../middleware/cache';


const ticketService = new TicketService();

export class OrderService {
  /**
   * Generate unique order number: ORD-YYYYMMDD-XXXX
   */

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    
    return `ORD-${year}${month}${day}-${random}`;
  }
  
  /**
   * Create new order with tickets
   */
  async createOrder(data: CreateOrderInput) {
    
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }
    
    
    // Generate unique order number
    let orderNumber = this.generateOrderNumber();
    let attempts = 0;
    
    // Ensure uniqueness
    while (attempts < 5) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber },
      });
      
      if (!existing) break;
      
      orderNumber = this.generateOrderNumber();
      attempts++;
    }

    if (attempts === 5) {
      throw new AppError(500, 'Failed to generate unique order number');
    }

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          quantity: data.quantity,
          amount: data.amount,
          status: OrderStatus.PENDING,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        },
        include: {
          customer: true,
        },
      });

      // Create tickets for this order
      const tickets = [];
      const settings = await ticketService.getSettings();
      
      for (let i = 0; i < data.quantity; i++) {
        const ticketCode = this.generateTicketCode();
        const validUntil = this.addDays(new Date(), settings.validityDays);

        const ticket = await tx.ticket.create({
          data: {
            ticketCode,
            orderId: newOrder.id,
            gameSession: data.gameSession,
            validUntil,
            maxScans: settings.maxScanCount,
            scanWindow: settings.scanWindowDays,
          },
        });

        tickets.push(ticket);
      }

      return { ...newOrder, tickets };
    });

    // Invalidate related caches (outside transaction)
    await invalidateCache('api:/analytics/*');
    await invalidateCache('api:/orders*');

    // Queue confirmation email
    await emailQueue.add('order-confirmation', {
      orderId: order.id,
      customerEmail: customer.email,
      orderNumber: order.orderNumber,
    });

    logger.info(`Order created: ${order.orderNumber} for customer ${customer.email}`);
    const start = Date.now();
  
    monitoring.addBreadcrumb('Creating order', {
      customerId: data.customerId,
      quantity: data.quantity,
    });

    try {
      
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            customerId: data.customerId,
            quantity: data.quantity,
            amount: data.amount,
            status: OrderStatus.PENDING,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          },
          include: {
            customer: true,
          },
        });

        const tickets = [];
        const settings = await ticketService.getSettings();

        for (let i = 0; i < data.quantity; i++) {
          const ticketCode = this.generateTicketCode();
          const validUntil = this.addDays(new Date(), settings.validityDays);

          const ticket = await tx.ticket.create({
            data: {
              ticketCode,
              orderId: newOrder.id,
              gameSession: data.gameSession,
              validUntil,
              maxScans: settings.maxScanCount,
              scanWindow: settings.scanWindowDays,
            },
          });

          tickets.push(ticket);
        }

        return { ...newOrder, tickets };
      });

      monitoring.trackPerformance('createOrder', Date.now() - start);
      
      return order;
    } catch (error) {
      monitoring.captureException(error as Error, {
        operation: 'createOrder',
        customerId: data.customerId,
      });
      throw error;
    }
    
  }

  /**
   * List orders with filters
   */
  async listOrders(filters: ListOrdersInput) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.purchaseDate = {};
      
      if (filters.startDate) {
        where.purchaseDate.gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        where.purchaseDate.lte = new Date(filters.endDate);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          tickets: {
            select: {
              id: true,
              ticketCode: true,
              status: true,
              scanCount: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        tickets: {
          include: {
            scanHistory: {
              orderBy: { scannedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    return order;
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    return order;
  }

  /**
   * Update order
   */
  async updateOrder(orderId: string, data: UpdateOrderInput) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        customer: true,
        tickets: true,
      },
    });

    logger.info(`Order updated: ${order.orderNumber}`);
    return order;
  }

  /**
   * Confirm payment and activate tickets
   */
  async confirmPayment(orderId: string, data: ConfirmPaymentInput) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        tickets: true,
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new AppError(400, 'Order already completed');
    }

    // Update order and customer in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
        },
        include: {
          customer: true,
          tickets: true,
        },
      });

      // Update customer stats
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: order.amount },
          lastPurchase: new Date(),
        },
      });

      // Generate QR codes for tickets (if not already done)
      for (const ticket of order.tickets) {
        if (!ticket.qrCodePath) {
          try {
            const qrPath = await this.generateQRForTicket(ticket, order);
            await tx.ticket.update({
              where: { id: ticket.id },
              data: { qrCodePath: qrPath },
            });
          } catch (error) {
            logger.error(`QR generation failed for ticket ${ticket.id}:`, error);
          }
        }
      }

      return updated;
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: order.customer.id, // This should be admin ID
        title: 'Payment Confirmed',
        message: `Payment confirmed for order ${order.orderNumber}`,
        type: 'SUCCESS',
      },
    });

    // Queue receipt email
    await emailQueue.add('payment-receipt', {
      orderId: updatedOrder.id,
      customerEmail: order.customer.email,
      orderNumber: updatedOrder.orderNumber,
      paymentReference: data.paymentReference,
    });

    logger.info(`Payment confirmed for order: ${order.orderNumber}`);

    return updatedOrder;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { tickets: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new AppError(400, 'Cannot cancel completed order');
    }

    // Cancel order and all tickets
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.ticket.updateMany({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });
    });

    logger.info(`Order cancelled: ${order.orderNumber}`);

    return { message: 'Order cancelled successfully' };
  }

  /**
   * Get order statistics
   */
  async getOrderStats(startDate?: string, endDate?: string) {
    const where: Prisma.OrderWhereInput = {};

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate);
      if (endDate) where.purchaseDate.lte = new Date(endDate);
    }

    const [total, pending, completed, cancelled, totalRevenue] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.COMPLETED } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
      prisma.order.aggregate({
        where: { ...where, status: OrderStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      pending,
      completed,
      cancelled,
      revenue: totalRevenue._sum.amount || 0,
    };
  }

  // Helper methods
  private generateTicketCode(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `JGPNR-${year}-${random}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async generateQRForTicket(ticket: any, _order: any): Promise<string> {
    return `/qrcodes/${ticket.ticketCode}.png`;
  }
}