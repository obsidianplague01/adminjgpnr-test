// services/payment.service.ts
import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient, OrderStatus, TicketStatus } from '@prisma/client';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import redis from '../../config/cache';
import { emailQueue } from '../../config/queue'; 
import { immutableAuditService } from '../../services/immutableAudit.service';
import { Request } from 'express';
import { generateQRCode } from '../../utils/ticket.utils';

const prisma = new PrismaClient();

interface PaystackResponse {
  status: boolean;
  message: string;
  data: any;
}

interface WebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    paid_at?: string;
    customer?: {
      email: string;
      first_name?: string;
      last_name?: string;
    };
    authorization?: {
      channel: string;
      card_type?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
      bank?: string;
    };
    metadata?: any;
    gateway_response?: string;
    fees?: number;
    currency?: string;
    ip_address?: string;
  };
}

export class PaymentService {
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly webhookIdempotencyTTL = 604800; 
  private readonly maxWebhookAge = 48; 

  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

    if (!this.paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }
  }
  async handleWebhook(payload: WebhookPayload, signature: string, req: Request) {
    const startTime = Date.now();
    
    try {
      if (!signature) {
        await this.logWebhookFailure(payload, req.ip, 'Missing signature');
        throw new AppError(401, 'Missing webhook signature');
      }

      if (!payload || !payload.event || !payload.data) {
        await this.logWebhookFailure(payload, req.ip, 'Invalid payload structure');
        throw new AppError(400, 'Invalid payload structure');
      }

      const { event, data } = payload;
      const reference = data.reference;

      if (!reference) {
        await this.logWebhookFailure(payload, req.ip, 'Missing reference');
        throw new AppError(400, 'Missing payment reference');
      }

      await this.validateWebhookTimestamp(data);

      const isDuplicate = await this.checkIdempotency(event, reference);

      if (isDuplicate) {
        logger.info('Duplicate webhook ignored', { event, reference });
        return { message: 'Webhook already processed', event, duplicate: true };
      }

      await this.verifyWebhookSignature(signature, req);
      
      await this.markWebhookProcessing(event, reference);

      logger.info(`Processing webhook: ${event}`, { 
        reference, 
        status: data.status,
        amount: data.amount 
      });

      const result = await this.processWebhookEvent(payload, req.ip);

      await this.markWebhookCompleted(event, reference);

      await immutableAuditService.createLog({
        action: 'WEBHOOK_PROCESSED',
        entity: 'PAYMENT',
        entityId: reference,
        ipAddress: req.ip,
        metadata: {
          event,
          reference,
          status: data.status,
          amount: data.amount,
          processingTime: Date.now() - startTime
        }
      });

      logger.info('Webhook processed successfully', {
        event,
        reference,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Webhook processing failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event: payload?.event,
        reference: payload?.data?.reference,
        processingTime
      });

      await immutableAuditService.createLog({
        action: 'WEBHOOK_FAILED',
        entity: 'PAYMENT',
        entityId: payload?.data?.reference,
        ipAddress: req.ip,
        metadata: {
          event: payload?.event,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime
        }
      });

      if (payload?.data?.reference) {
        await this.clearWebhookLock(payload.event, payload.data.reference);
      }

      throw error;
    }
  }
  private async addJitter(): Promise<void> {
    const jitter = 100 + Math.floor(Math.random() * 100);
    await new Promise(resolve => setTimeout(resolve, jitter));
  }
  
  private async verifyWebhookSignature(signature: string, req: Request): Promise<void> {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new AppError(500, 'Raw body unavailable');
    }

    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(rawBody)
      .digest('hex');
    if (signature.length !== hash.length) {
      await this.addJitter();
      throw new AppError(401, 'Invalid webhook signature');
    }

    const signatureBuffer = Buffer.from(signature, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    if (signatureBuffer.length !== hashBuffer.length) {
      await this.addJitter();
      throw new AppError(401, 'Invalid webhook signature');
    }
    if (!crypto.timingSafeEqual(signatureBuffer, hashBuffer)) {
      await this.addJitter();
      throw new AppError(401, 'Invalid webhook signature');
    }

  }
  
  private async checkIdempotency(event: string, reference: string): Promise<boolean> {
    const idempotencyKey = `webhook:${event}:${reference}`;
    const status = await redis.get(idempotencyKey);
      
    if (!status) {
      const existing = await prisma.webhookLog.findUnique({
        where: {
          event_reference: {
            event,
            reference
          }
        }
      });
      return existing !== null;
    }
    
    return status !== null;
  }

 
  private async markWebhookProcessing(event: string, reference: string): Promise<void> {
    const idempotencyKey = `webhook:${event}:${reference}`;
    const lockKey = `webhook:lock:${event}:${reference}`;

    const lockAcquired = await redis.set(lockKey, '1', 'EX', 60, 'NX'); // 60 second lock

    if (!lockAcquired) {
      throw new AppError(409, 'Webhook is already being processed');
    }

    // Mark as processing
    await redis.setex(idempotencyKey, this.webhookIdempotencyTTL, 'processing');
  }

  private async markWebhookCompleted(event: string, reference: string): Promise<void> {
    const idempotencyKey = `webhook:${event}:${reference}`;
    const lockKey = `webhook:lock:${event}:${reference}`;

    await redis.setex(idempotencyKey, this.webhookIdempotencyTTL, 'completed');
    await redis.del(lockKey);
  }

  private async clearWebhookLock(event: string, reference: string): Promise<void> {
    const lockKey = `webhook:lock:${event}:${reference}`;
    await redis.del(lockKey);
  }

  private async validateWebhookTimestamp(data: any): Promise<void> {
    if (data.paid_at) {
      const paidAt = new Date(data.paid_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > this.maxWebhookAge) {
        logger.warn('Webhook timestamp too old', {
          paidAt: paidAt.toISOString(),
          hoursDiff,
          maxAge: this.maxWebhookAge
        });
        throw new AppError(400, 'Webhook timestamp expired');
      }
    }
  }

  private async processWebhookEvent(payload: WebhookPayload, ipAddress?: string) {
    const { event, data } = payload;

    switch (event) {
      case 'charge.success':
        return await this.handleSuccessfulPayment(data, ipAddress);

      case 'charge.failed':
        return await this.handleFailedPayment(data, ipAddress);

      case 'charge.disputed':
        return await this.handleDisputedPayment(data, ipAddress);

      case 'transfer.success':
        return await this.handleTransferSuccess(data, ipAddress);

      case 'transfer.failed':
        return await this.handleTransferFailed(data, ipAddress);

      case 'refund.processed':
        return await this.handleRefundProcessed(data, ipAddress);

      default:
        logger.info(`Unhandled webhook event: ${event}`, { data });
        return { message: 'Event acknowledged but not processed', event };
    }
  }

  private async handleSuccessfulPayment(data: any, ipAddress?: string) {
     logger.info('Payment webhook received', {
      reference: data.reference,
      amount: data.amount / 100,
      channel: data.authorization?.channel,
      ipAddress,
      timestamp: new Date().toISOString()
    });
    const reference = data.reference;

    return await prisma.$transaction(async (tx) => {
      
      const order = await tx.order.findFirst({
        where: { 
          OR: [
            { orderNumber: reference },
            { paymentReference: reference }
          ]
        },
        include: {
          customer: true,
          tickets: true
        }
      });

      if (!order) {
        logger.warn('Order not found for webhook', { reference });
        throw new AppError(404, 'Order not found');
      }

      // Check if already completed
      if (order.status === OrderStatus.COMPLETED) {
        logger.info('Order already completed', { reference, orderId: order.id });
        return { 
          message: 'Order already completed', 
          orderId: order.id,
          alreadyProcessed: true 
        };
      }

      const expectedAmount = Math.round(parseFloat(order.amount.toString()) * 100);
      const paidAmount = data.amount;

      const maxAllowed = Math.ceil(expectedAmount * 1.01);


      if (paidAmount < expectedAmount) {
        await this.logPaymentMismatch(order, expectedAmount, paidAmount, 'underpayment');
        throw new AppError(400, `Insufficient payment: expected ₦${expectedAmount/100}, received ₦${paidAmount/100}`);
      }

      if (paidAmount > maxAllowed) {
        await this.logPaymentMismatch(order, expectedAmount, paidAmount, 'overpayment');
        throw new AppError(400, `Overpayment detected: expected ₦${expectedAmount/100}, received ₦${paidAmount/100}`);
      }
      if (paidAmount !== expectedAmount) {
        logger.warn('Payment amount variance within tolerance', {
          orderId: order.id,
          expected: expectedAmount,
          received: paidAmount,
          variance: paidAmount - expectedAmount
        });
      }
      const activatedTickets = await Promise.all(
        order.tickets.map(async (ticket) => {
          if (ticket.status === TicketStatus.PENDING) {
            const qrCodePath = await generateQRCode(ticket.ticketCode, {
              orderId: order.id,
              customerId: order.customerId,
              gameSession: ticket.gameSession,
              validUntil: ticket.validUntil,
            });

            return await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: TicketStatus.ACTIVE,
                qrCodePath
              }
            });
          }
          return ticket;
        }));

      await this.sendPaymentConfirmationEmail(order, data);

      await immutableAuditService.createLog({
        userId: order.customerId,
        action: 'PAYMENT_SUCCESS',
        entity: 'ORDER',
        entityId: order.id,
        ipAddress,
        changes: {
          from: { status: order.status },
          to: { status: OrderStatus.COMPLETED }
        },
        metadata: {
          reference: data.reference,
          amount: paidAmount / 100,
          channel: data.authorization?.channel,
          ticketsActivated: activatedTickets.length
        }
      });

      logger.info('Payment processed successfully', {
        orderId: order.id,
        reference,
        amount: paidAmount / 100,
        ticketsActivated: activatedTickets.length
      });
      logger.info('Payment processed successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        reference: data.reference,
        amount: paidAmount / 100,
        ticketsActivated: activatedTickets.length,
        processingTime: Date.now(),
        customerEmail: order.customer.email
      });
      return {
        message: 'Payment processed successfully',
        orderId: order.id,
        reference,
        ticketsActivated: activatedTickets.length
      };
    });
    
  }

  private async handleFailedPayment(data: any, ipAddress?: string) {
    const reference = data.reference;

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          OR: [
            { orderNumber: reference },
            { paymentReference: reference }
          ]
        },
        include: { customer: true }
      });

      if (!order) {
        logger.warn('Order not found for failed payment', { reference });
        return { message: 'Order not found', reference };
      }

      
      await this.sendPaymentFailureEmail(order, data);

      await immutableAuditService.createLog({
        userId: order.customerId,
        action: 'PAYMENT_FAILED',
        entity: 'ORDER',
        entityId: order.id,
        ipAddress,
        metadata: {
          reference,
          reason: data.gateway_response,
          amount: data.amount / 100
        }
      });

      logger.warn('Payment failed', {
        orderId: order.id,
        reference,
        reason: data.gateway_response
      });

      return {
        message: 'Payment failure recorded',
        orderId: order.id,
        reference
      };
    });
  }

  private async handleDisputedPayment(data: any, ipAddress?: string) {
    const reference = data.reference;

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          OR: [
            { orderNumber: reference },
            { paymentReference: reference }
          ]
        },
        include: { 
          customer: true,
          tickets: true 
        }
      });

      if (!order) {
        logger.warn('Order not found for disputed payment', { reference });
        return { message: 'Order not found', reference };
      }

      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: 'disputed',
          paymentMetadata: JSON.stringify({
            disputed: true,
            disputeReason: data.reason,
            disputedAt: new Date()
          })
        }
      });

      await tx.ticket.updateMany({
        where: { orderId: order.id },
        data: { status: TicketStatus.CANCELLED }
      });
       await emailQueue.add('payment-dispute-alert', {
        to: process.env.ADMIN_EMAIL || 'admin@jgpnr.com',
        subject: '🚨 Payment Dispute Alert',
        orderNumber: order.orderNumber,
        reference,
        amount: order.amount,
        customerEmail: order.customer.email,
        reason: data.reason,
      });


      await immutableAuditService.createLog({
        userId: order.customerId,
        action: 'PAYMENT_DISPUTED',
        entity: 'ORDER',
        entityId: order.id,
        ipAddress,
        metadata: {
          reference,
          reason: data.reason,
          amount: order.amount
        }
      });

      logger.error('Payment disputed (chargeback)', {
        orderId: order.id,
        reference,
        reason: data.reason
      });

      return {
        message: 'Payment dispute recorded',
        orderId: order.id,
        reference,
        action: 'tickets_cancelled'
      };
    });
  }

  private async handleTransferSuccess(data: any, ipAddress?: string) {
    logger.info('Transfer success webhook received', { data });

    await immutableAuditService.createLog({
      action: 'TRANSFER_SUCCESS',
      entity: 'PAYMENT',
      entityId: data.reference,
      ipAddress,
      metadata: data
    });

    return { message: 'Transfer success recorded' };
  }

  private async handleTransferFailed(data: any, ipAddress?: string) {
    logger.warn('Transfer failed webhook received', { data });

    await immutableAuditService.createLog({
      action: 'TRANSFER_FAILED',
      entity: 'PAYMENT',
      entityId: data.reference,
      ipAddress,
      metadata: data
    });

    return { message: 'Transfer failure recorded' };
  }

  private async handleRefundProcessed(data: any, ipAddress?: string) {
    const reference = data.reference;

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          OR: [
            { orderNumber: reference },
            { paymentReference: reference }
          ]
        },
        include: { customer: true }
      });

      if (!order) {
        logger.warn('Order not found for refund', { reference });
        return { message: 'Order not found', reference };
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: 'refunded',
          paymentMetadata: JSON.stringify({
            refunded: true,
            refundedAt: new Date(),
            refundAmount: data.amount / 100
          })
        }
      });

      // Send refund confirmation
      await emailQueue.add('refund-confirmation', {
        to: order.customer.email,
        orderNumber: order.orderNumber,
        amount: data.amount / 100,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      });

      await immutableAuditService.createLog({
        userId: order.customerId,
        action: 'REFUND_PROCESSED',
        entity: 'ORDER',
        entityId: order.id,
        ipAddress,
        metadata: {
          reference,
          amount: data.amount / 100
        }
      });

      return {
        message: 'Refund processed',
        orderId: order.id,
        reference
      };
    });
  }

 private async sendPaymentConfirmationEmail(order: any, paymentData: any) {
    try {
      await emailQueue.add('payment-confirmation', {
        orderId: order.id,
        customerEmail: order.customer.email,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        orderNumber: order.orderNumber,
        amount: paymentData.amount / 100,
        ticketCount: order.tickets.length,
        paymentMethod: paymentData.authorization?.channel,
        paidAt: paymentData.paid_at,
      });
    } catch (error) {
      logger.error('Failed to send payment confirmation email:', error);
    }
  }

  private async sendPaymentFailureEmail(order: any, paymentData: any) {
    try {
      await emailQueue.add('payment-failure', {
        orderId: order.id,
        customerEmail: order.customer.email,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        orderNumber: order.orderNumber,
        amount: paymentData.amount / 100,
        reason: paymentData.gateway_response,
      });
    } catch (error) {
      logger.error('Failed to send payment failure email:', error);
    }
  }

  private async logWebhookFailure(payload: any, ipAddress?: string, reason?: string) {
    try {
      await immutableAuditService.createLog({
        action: 'WEBHOOK_REJECTED',
        entity: 'PAYMENT',
        entityId: payload?.data?.reference,
        ipAddress,
        metadata: {
          event: payload?.event,
          reason,
          payloadPreview: JSON.stringify(payload).substring(0, 500)
        }
      });
    } catch (error) {
      logger.error('Failed to log webhook failure:', error);
    }
  }

  async initializePayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new AppError(400, 'Order already paid');
    }

    const amount = Math.round(parseFloat(order.amount.toString()) * 100); // Convert to kobo

    try {
      const response = await axios.post<PaystackResponse>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: order.customer.email,
          amount,
          reference: order.orderNumber,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          metadata: {
            orderId: order.id,
            customerId: order.customerId,
            ticketCount: order.quantity
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.status) {
        throw new AppError(500, response.data.message);
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentReference: response.data.data.reference,
          paymentStatus: 'pending'
        }
      });

      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference
      };
    } catch (error) {
      logger.error('Payment initialization failed:', error);
      throw new AppError(500, 'Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await axios.get<PaystackResponse>(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`
          }
        }
      );

      if (!response.data.status) {
        throw new AppError(500, response.data.message);
      }

      const data = response.data.data;

      return {
        success: data.status === 'success',
        status: data.status,
        reference: data.reference,
        amount: data.amount / 100,
        paidAt: data.paid_at,
        channel: data.authorization?.channel,
        message: data.gateway_response
      };
    } catch (error) {
      logger.error('Payment verification failed:', error);
      throw new AppError(500, 'Failed to verify payment');
    }
  }

  async initiateRefund(orderId: string, amount?: number, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        customer: true,
        tickets: true,
        refunds: true
      }
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      const message = process.env.NODE_ENV === 'production'
        ? 'Refund not available for this order'
        : `Only completed orders can be refunded (status: ${order.status})`;
      throw new AppError(400, message);
    }

    if (!order.paymentReference) {
      throw new AppError(400, 'No payment reference found for this order');
    }

    // Check if already fully refunded
    const totalRefunded = order.refunds
      .filter(r => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

    const orderAmount = parseFloat(order.amount.toString());
    
    if (totalRefunded >= orderAmount) {
      throw new AppError(400, 'Order already fully refunded');
    }

    // Calculate refund amount
    const refundAmount = amount || (orderAmount - totalRefunded);
    
    if (refundAmount > (orderAmount - totalRefunded)) {
      throw new AppError(400, 'Refund amount exceeds refundable balance');
    }

    // Convert to kobo for Paystack
    const amountInKobo = Math.round(refundAmount * 100);

    try {
      // Call Paystack refund API
      const response = await axios.post<PaystackResponse>(
        `${this.paystackBaseUrl}/refund`,
        {
          transaction: order.paymentReference,
          amount: amountInKobo,
          currency: 'NGN',
          customer_note: reason || 'Refund processed',
          merchant_note: `Order ${order.orderNumber} refund`
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.status) {
        throw new AppError(500, response.data.message || 'Refund initiation failed');
      }

      logger.info('Refund initiated successfully', {
        orderId,
        reference: order.paymentReference,
        amount: refundAmount,
        paystackResponse: response.data.data
      });

      return {
        success: true,
        message: 'Refund initiated successfully',
        refundId: response.data.data.id,
        amount: refundAmount,
        status: response.data.data.status
      };

    } catch (error: any) {
      logger.error('Paystack refund failed:', {
        orderId,
        error: error.response?.data || error.message
      });

      throw new AppError(
        500, 
        error.response?.data?.message || 'Failed to process refund with payment gateway'
      );
    }
  }
}

export const paymentService = new PaymentService();