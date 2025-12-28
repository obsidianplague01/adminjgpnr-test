// src/modules/payment/payment.service.ts
import crypto from 'crypto';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import { UserRole, Prisma } from '@prisma/client';
import redis from '../../config/cache';

export class PaymentService {
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  private readonly baseURL = 'https://api.paystack.co';
  private readonly timeout = 30000;

  constructor() {
    if (!this.paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }
    if (!this.paystackSecretKey.startsWith('sk_')) {
      logger.warn('Paystack secret key format may be incorrect');
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Payment request timed out');
      }
      throw error;
    }
  }

  async initializePayment(orderId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new AppError(400, 'Order already paid');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot pay for cancelled order');
    }

    const amountInKobo = Math.round(Number(order.amount) * 100);

    if (amountInKobo < 1000) {
      throw new AppError(400, 'Payment amount too small (minimum ₦10)');
    }

    const payload = {
      email: order.customer.email,
      amount: amountInKobo,
      reference: order.orderNumber,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        initiatedBy: userId,
      },
    };

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/transaction/initialize`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Paystack API error:', {
          status: response.status,
          body: errorText,
          orderId,
        });
        throw new Error(`Paystack API returned ${response.status}`);
      }

      const data: any = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Payment initialization failed');
      }

      logger.info(`Payment initialized for order: ${order.orderNumber}`, {
        orderId: order.id,
        amount: order.amount,
        userId,
      });

      return {
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
        amount: order.amount,
        orderNumber: order.orderNumber,
      };
    } catch (error: any) {
      logger.error('Paystack initialization error:', error);
      throw new AppError(500, `Failed to initialize payment: ${error.message}`);
    }
  }

  async verifyPayment(reference: string) {
    if (!reference || reference.length < 5) {
      throw new AppError(400, 'Invalid payment reference');
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Paystack verification error:', {
          status: response.status,
          body: errorText,
          reference,
        });
        throw new Error(`Paystack API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Payment verification failed');
      }

      const paymentData = data.data;

      logger.info(`Payment verified: ${reference}`, {
        status: paymentData.status,
        amount: paymentData.amount / 100,
      });

      return {
        success: paymentData.status === 'success',
        status: paymentData.status,
        reference: paymentData.reference,
        amount: paymentData.amount / 100,
        paidAt: paymentData.paid_at,
        channel: paymentData.channel,
        metadata: paymentData.metadata,
        message: paymentData.gateway_response,
      };
    } catch (error: any) {
      logger.error('Paystack verification error:', error);
      throw new AppError(500, `Failed to verify payment: ${error.message}`);
    }
  }

  
  async handleWebhook(payload: any, signature: string, req?: Request) {
    
    if (!signature) {
      logger.warn('Webhook received without signature', { ip: req?.ip });
      throw new AppError(401, 'Missing webhook signature');
    }

    if (!payload || !payload.event || !payload.data) {
      logger.warn('Invalid webhook payload structure');
      throw new AppError(400, 'Invalid payload');
    }

    const rawBody = (req as any).rawBody; 
    
    if (!rawBody) {
      logger.error('Raw body not available for webhook verification');
      throw new AppError(500, 'Server configuration error');
    }

    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(rawBody)  
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const hashBuffer = Buffer.from(hash, 'utf8');

    if (signatureBuffer.length !== hashBuffer.length) {
      logger.warn('Invalid webhook signature length', {
        expected: hashBuffer.length,
        received: signatureBuffer.length,
      });
      throw new AppError(401, 'Invalid webhook signature');
    }

    if (!crypto.timingSafeEqual(signatureBuffer, hashBuffer)) {
      logger.warn('Invalid webhook signature', {
        event: payload.event,
        signaturePrefix: signature.substring(0, 10),
      });
      throw new AppError(401, 'Invalid webhook signature');
    }

    const { event, data } = payload;
    const reference = data.reference;

    const idempotencyKey = `webhook:${event}:${reference}`;
    const alreadyProcessed = await redis.get(idempotencyKey);

    if (alreadyProcessed) {
      logger.info('Duplicate webhook ignored', { event, reference });
      return { message: 'Webhook already processed', event };
    }

    if (data.paid_at) {
      const paidAt = new Date(data.paid_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        logger.warn('Webhook timestamp too old', {
          event,
          reference,
          paidAt: paidAt.toISOString(),
          hoursDiff,
        });
        throw new AppError(400, 'Webhook timestamp expired');
      }
    }

    await redis.setex(idempotencyKey, 86400, '1');

    logger.info(`Webhook received: ${event}`, { reference });

    try {
      switch (event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(data);
          break;

        case 'charge.failed':
          await this.handleFailedPayment(data);
          break;

        case 'transfer.success':
          logger.info('Transfer success webhook received');
          break;

        case 'transfer.failed':
          logger.warn('Transfer failed webhook received');
          break;

        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }

      return { message: 'Webhook processed', event };
    } catch (error) {
      logger.error('Webhook processing error:', error);
      
      await redis.del(idempotencyKey);
      
      throw error;
    }
  }

  private async handleSuccessfulPayment(data: any) {
    const orderId = data.metadata?.orderId;

    if (!orderId) {
      logger.error('Order ID not found in webhook metadata', {
        reference: data.reference,
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, tickets: true },
    });

    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      return;
    }

    if (order.status === 'COMPLETED') {
      logger.info(`Order already completed: ${order.orderNumber}`);
      return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            paymentReference: data.reference,
            paymentChannel: data.channel,
            paidAt: new Date(), 
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

      await tx.ticket.updateMany({
        where: { orderId: order.id },
        data: { status: 'ACTIVE' },
      });

      // Fix: Use isActive instead of status for User model
      const admins = await tx.user.findMany({
        where: {
          role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
          isActive: true, // Fix: Use isActive boolean field
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: 'Payment Successful',
            message: `Payment of ₦${order.amount} for order ${order.orderNumber} from ${order.customer.firstName} ${order.customer.lastName} was successful`,
            type: 'SUCCESS',
          },
        });
      }
    });

    logger.info(`Payment processed successfully for order: ${order.orderNumber}`, {
      orderId: order.id,
      amount: order.amount,
      reference: data.reference,
    });
  }

  private async handleFailedPayment(data: any) {
    const orderId = data.metadata?.orderId;

    if (!orderId) {
      logger.error('Order ID not found in failed payment webhook');
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      return;
    }

    // Fix: Use isActive instead of status
    const admins = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        isActive: true, // Fix: Use isActive boolean field
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Payment Failed',
          message: `Payment for order ${order.orderNumber} from ${order.customer.firstName} ${order.customer.lastName} failed. Reason: ${data.gateway_response || 'Unknown'}`,
          type: 'ERROR',
        },
      });
    }

    logger.warn(`Payment failed for order: ${order.orderNumber}`, {
      orderId: order.id,
      reference: data.reference,
      reason: data.gateway_response,
    });
  }
  async getTransactions(page = 1, limit = 20) {
    
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.OrderWhereInput = {
      status: { in: ['COMPLETED', 'PENDING'] },
      paidAt: { not: null }, 
    };

    try {
      const [transactions, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { paidAt: 'desc' },
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
          },
        }),
        prisma.order.count({ where }),
      ]);

      logger.info('Transactions fetched', {
        page: safePage,
        limit: safeLimit,
        total,
        returned: transactions.length,
      });

      return {
        transactions,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
          hasNext: skip + safeLimit < total,
          hasPrev: safePage > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch transactions:', error);
      throw new AppError(500, 'Failed to retrieve transaction history');
    }
  }
}