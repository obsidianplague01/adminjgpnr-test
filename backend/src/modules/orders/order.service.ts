// src/modules/orders/order.service.ts
import { OrderStatus, Prisma, UserRole, TicketStatus } from '@prisma/client';
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
import { immutableAuditService } from '../../services/immutableAudit.service';
import { geolocationService } from '../../utils/geolocation';
import crypto from 'crypto';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';

const ticketService = new TicketService();

function generateSecureCode(length: number, charset: string): string {
  const result: string[] = [];
  const randomBytes = crypto.randomBytes(length * 2); // Extra bytes for safety
  
  let cursor = 0;
  while (result.length < length && cursor < randomBytes.length) {
    const byte = randomBytes[cursor];
    if (byte < charset.length * Math.floor(256 / charset.length)) {
      result.push(charset[byte % charset.length]);
    }
    cursor++;
  }
  
  if (result.length < length) {
    throw new Error('Failed to generate secure code');
  }
  
  return result.join('');
}

export class OrderService {
  private orderCounter: number = 0;
  private readonly qrCodeDir = path.join(process.cwd(), 'uploads', 'qrcodes');

  constructor() {
    this.ensureQRDirectory();
    this.initializeOrderCounter();
  }

  private async initializeOrderCounter() {
    const latestOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true }
    });
    
    if (latestOrder) {
      const match = latestOrder.orderNumber.match(/-(\d+)-/);
      this.orderCounter = match ? parseInt(match[1]) + 1 : 0;
    }
  }

  private async ensureQRDirectory() {
    try {
      await fs.mkdir(this.qrCodeDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create QR directory:', error);
    }
  }

 private generateOrderNumber(): string {
  
    const hrTime = process.hrtime.bigint().toString(36).toUpperCase();
    const random = crypto.randomBytes(8).toString('hex').toUpperCase(); // More bytes
    const counter = this.orderCounter++; // Add in-memory counter
    
    return `ORD-${hrTime}-${counter.toString(36).toUpperCase()}-${random}`;
  }

  private generateTicketCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0,O,1,I
    const code = generateSecureCode(8, chars);
    return `JGPNR-${code}`;
  }

  async createOrder(data: CreateOrderInput, ipAddress?: string, userId?: string) {
    const start = Date.now();
    
    monitoring.addBreadcrumb('Creating order', {
      customerId: data.customerId,
      quantity: data.quantity,
    });

    try {
      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new AppError(404, 'Customer not found');
      }

      // Get geolocation if IP provided
      const location = ipAddress 
        ? await geolocationService.getLocation(ipAddress)
        : null;

      // Get ticket settings
      const settings = await ticketService.getSettings();

      // Create order with retry logic OUTSIDE transaction
      let order;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const orderNumber = this.generateOrderNumber();

          order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
              data: {
                orderNumber,
                customerId: data.customerId,
                quantity: data.quantity,
                amount: data.amount,
                status: OrderStatus.PENDING,
                paymentStatus: 'pending',
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
              },
              include: {
                customer: true,
              },
            });

            // Create tickets for this order
            const tickets = [];
            
            for (let i = 0; i < data.quantity; i++) {
              const ticketCode = this.generateTicketCode();
              const validUntil = this.addDays(new Date(), settings.validityDays);

              const ticket = await tx.ticket.create({
                data: {
                  ticketCode,
                  orderId: newOrder.id,
                  gameSession: data.gameSession || 'Default Session',
                  validUntil,
                  maxScans: settings.maxScanCount,
                  scanWindow: settings.scanWindowDays,
                  status: TicketStatus.PENDING, // Pending until payment
                },
              });

              tickets.push(ticket);
            }

            return { ...newOrder, tickets };
          }, {
            timeout: 10000, // 10 second timeout
            isolationLevel: 'Serializable'
          });

          // Success - break the retry loop
          break;

        } catch (error: any) {
          attempts++;

          // If unique constraint violation, retry with exponential backoff
          if (error.code === 'P2002' && attempts < maxAttempts) {
            const backoffMs = Math.pow(2, attempts) * 100;
            logger.warn(`Order number collision, retrying in ${backoffMs}ms (attempt ${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }

          // If max attempts reached or different error, throw
          throw error.code === 'P2002'
            ? new AppError(500, 'Failed to generate unique order number after multiple attempts')
            : error;
        }
      }

      if (!order) {
        throw new AppError(500, 'Order creation failed');
      }

      // Invalidate relevant caches
      await Promise.all([
        invalidateCache('api:/analytics/*'),
        invalidateCache('api:/orders*'),
        invalidateCache(`api:/customers/${customer.id}*`)
      ]);

      // Queue confirmation email
      await emailQueue.add('order-confirmation', {
        orderId: order.id,
        customerEmail: customer.email,
        orderNumber: order.orderNumber,
      });

      // Log in immutable audit
      await immutableAuditService.createLog({
        userId,
        action: 'ORDER_CREATED',
        entity: 'ORDER',
        entityId: order.id,
        ipAddress,
        metadata: {
          orderNumber: order.orderNumber,
          customerId: customer.id,
          customerEmail: customer.email,
          quantity: data.quantity,
          amount: data.amount,
          location,
          ticketCodes: order.tickets.map((t: any) => t.ticketCode)
        }
      });

      logger.info(`Order created: ${order.orderNumber} for customer ${customer.email}`, {
        orderId: order.id,
        ticketCount: order.tickets.length
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
              maxScans: true,
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

  async getOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        tickets: {
          include: {
            scanHistory: {
              orderBy: { scannedAt: 'desc' },
              take: 10,
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

  async updateOrder(orderId: string, data: UpdateOrderInput, userId?: string, ipAddress?: string) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, status: true, amount: true }
    });

    if (!existingOrder) {
      throw new AppError(404, 'Order not found');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        customer: true,
        tickets: true,
      },
    });

    // Log in immutable audit
    await immutableAuditService.createLog({
      userId,
      action: 'ORDER_UPDATED',
      entity: 'ORDER',
      entityId: orderId,
      ipAddress,
      changes: {
        from: existingOrder,
        to: { status: order.status, amount: order.amount }
      }
    });

    logger.info(`Order updated: ${order.orderNumber}`, { orderId, changes: data });
    
    await invalidateCache(`api:/orders/${orderId}*`);
    
    return order;
  }

  async confirmPayment(
    orderId: string, 
    data: ConfirmPaymentInput,
    userId?: string,
    ipAddress?: string
  ) {
    try {
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

      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.COMPLETED,
            paymentStatus: 'paid',
            paidAt: new Date(),
            paidAmount: data.paidAmount,
            paymentReference: data.paymentReference,
            paymentMethod: data.paymentMethod,
          },
          include: {
            customer: true,
            tickets: true,
          },
        });

        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: order.amount },
            lastPurchase: new Date(),
          },
        });

        const activatedTickets = [];
        for (const ticket of order.tickets) {
          try {
          
            const qrPath = await this.generateQRForTicket(ticket, order);
            
            const activatedTicket = await tx.ticket.update({
              where: { id: ticket.id },
              data: { 
                status: TicketStatus.ACTIVE,
                qrCodePath: qrPath 
              },
            });
            
            activatedTickets.push(activatedTicket);
          } catch (error) {
            logger.error(`Failed to activate ticket ${ticket.id}:`, error);
            throw new AppError(500, `Failed to activate ticket ${ticket.ticketCode}`);
          }
        }

        const admins = await tx.user.findMany({
          where: {
            role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
            isActive: true,
          },
          select: { id: true },
        });

        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: 'Payment Confirmed',
              message: `Payment confirmed for order ${order.orderNumber} from ${order.customer.firstName} ${order.customer.lastName}`,
              type: 'SUCCESS',
            },
          });
        }

        return { ...updated, tickets: activatedTickets };
      });

      await emailQueue.add('payment-receipt', {
        orderId: updatedOrder.id,
        customerEmail: order.customer.email,
        orderNumber: updatedOrder.orderNumber,
        paymentReference: data.paymentReference,
        tickets: updatedOrder.tickets,
      });

      await immutableAuditService.createLog({
        userId,
        action: 'PAYMENT_CONFIRMED',
        entity: 'ORDER',
        entityId: orderId,
        ipAddress,
        metadata: {
          orderNumber: order.orderNumber,
          paymentReference: data.paymentReference,
          amount: data.paidAmount,
          paymentMethod: data.paymentMethod,
          customerId: order.customerId,
          ticketsActivated: updatedOrder.tickets.length
        }
      });

      logger.info(`Payment confirmed for order: ${order.orderNumber}`, {
        orderId,
        amount: data.paidAmount,
        ticketsActivated: updatedOrder.tickets.length
      });

      await Promise.all([
        invalidateCache(`api:/orders/${orderId}*`),
        invalidateCache('api:/analytics/*'),
        invalidateCache(`api:/customers/${order.customerId}*`)
      ]);

      return updatedOrder;
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
          throw new AppError(409, 'Transaction conflict, please retry');
        }
        throw error;
    }
    
  }

  async cancelOrder(orderId: string, reason?: string, userId?: string, ipAddress?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        tickets: true,
        customer: true 
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new AppError(400, 'Cannot cancel completed order. Please process a refund instead.');
    }

    // Cancel order and all tickets
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { 
          status: OrderStatus.CANCELLED,
          paymentStatus: 'cancelled'
        },
      });

      await tx.ticket.updateMany({
        where: { orderId },
        data: { status: TicketStatus.CANCELLED },
      });
    });

    // Send cancellation email
    await emailQueue.add('order-cancelled', {
      orderId,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      reason,
    });

    // Log in immutable audit
    await immutableAuditService.createLog({
      userId,
      action: 'ORDER_CANCELLED',
      entity: 'ORDER',
      entityId: orderId,
      ipAddress,
      metadata: {
        orderNumber: order.orderNumber,
        reason,
        customerId: order.customerId,
        ticketsCancelled: order.tickets.length
      }
    });

    logger.info(`Order cancelled: ${order.orderNumber}`, { orderId, reason });

    await invalidateCache(`api:/orders/${orderId}*`);

    return { message: 'Order cancelled successfully' };
  }

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

  private async generateQRForTicket(ticket: any, order: any): Promise<string> {
    try {
      await this.ensureQRDirectory();

      // Create encrypted QR data
      const qrData = JSON.stringify({
        ticketCode: ticket.ticketCode,
        orderId: order.id,
        orderNumber: order.orderNumber,
        validUntil: ticket.validUntil,
        maxScans: ticket.maxScans,
        gameSession: ticket.gameSession,
        issued: new Date().toISOString()
      });

      // Encrypt the QR data
      const encryptedData = this.encryptQRData(qrData);

      // Generate QR code
      const qrFileName = `${ticket.ticketCode}.png`;
      const qrFilePath = path.join(this.qrCodeDir, qrFileName);

      await QRCode.toFile(qrFilePath, encryptedData, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.info(`QR code generated for ticket ${ticket.ticketCode}`);

      // Return relative path for database storage
      return `/uploads/qrcodes/${qrFileName}`;

    } catch (error) {
      logger.error(`QR generation failed for ticket ${ticket.ticketCode}:`, error);
      throw new AppError(500, 'Failed to generate QR code');
    }
  }

  private encryptQRData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.QR_ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    // Combine IV + Auth Tag + Encrypted Data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public decryptQRData(encryptedData: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.QR_ENCRYPTION_KEY!, 'hex');
      
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('QR decryption failed:', error);
      throw new AppError(400, 'Invalid QR code');
    }
  }

 
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async getCustomerOrders(customerId: string, limit: number = 10) {
    return await prisma.order.findMany({
      where: { customerId },
      take: limit,
      orderBy: { purchaseDate: 'desc' },
      include: {
        tickets: {
          select: {
            id: true,
            ticketCode: true,
            status: true,
            scanCount: true,
            maxScans: true,
          }
        }
      }
    });
  }

  async resendConfirmation(orderId: string, userId?: string, ipAddress?: string) {
    const order = await this.getOrder(orderId);

    await emailQueue.add('order-confirmation', {
      orderId: order.id,
      customerEmail: order.customer.email,
      orderNumber: order.orderNumber,
      isResend: true
    });

    await immutableAuditService.createLog({
      userId,
      action: 'ORDER_CONFIRMATION_RESENT',
      entity: 'ORDER',
      entityId: orderId,
      ipAddress,
      metadata: {
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email
      }
    });

    logger.info(`Order confirmation resent: ${order.orderNumber}`);

    return { message: 'Confirmation email resent successfully' };
  }
}

export const orderService = new OrderService();