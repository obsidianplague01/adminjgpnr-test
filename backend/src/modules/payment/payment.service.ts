// src/modules/payment/payment.service.ts
import crypto from 'crypto';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';

export class PaymentService {
  private readonly paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
  private readonly baseURL = 'https://api.paystack.co';

  /**
   * Initialize payment
   */
  async initializePayment(orderId: string) {
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

    // Convert amount to kobo (Paystack requires amount in smallest currency unit)
    const amountInKobo = Number(order.amount) * 100;

    const payload = {
      email: order.customer.email,
      amount: amountInKobo,
      reference: order.orderNumber,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        orderId: order.id,
        customerId: order.customerId,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}/transaction/initialize`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${this.paystackSecretKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const data: any = await response.json();

if (!data.status) {
  throw new Error(data.message || 'Payment initialization failed');
}

      logger.info(`Payment initialized for order: ${order.orderNumber}`);

      return {
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
      };
    } catch (error: any) {
      logger.error('Paystack initialization error:', error);
      throw new AppError(500, 'Failed to initialize payment');
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(reference: string) {
    try {
      const response = await fetch(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Payment verification failed');
      }

      const paymentData = data.data;

      logger.info(`Payment verified: ${reference}`);

      return {
        status: paymentData.status,
        reference: paymentData.reference,
        amount: paymentData.amount / 100, // Convert from kobo
        paidAt: paymentData.paid_at,
        channel: paymentData.channel,
        metadata: paymentData.metadata,
      };
    } catch (error: any) {
      logger.error('Paystack verification error:', error);
      throw new AppError(500, 'Failed to verify payment');
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new AppError(401, 'Invalid webhook signature');
    }

    const event = payload.event;
    const data = payload.data;

    logger.info(`Webhook received: ${event}`);

    switch (event) {
      case 'charge.success':
        await this.handleSuccessfulPayment(data);
        break;

      case 'charge.failed':
        await this.handleFailedPayment(data);
        break;

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    return { message: 'Webhook processed' };
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(data: any) {
    const orderId = data.metadata?.orderId;

    if (!orderId) {
      logger.error('Order ID not found in webhook metadata');
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

    if (order.status === 'COMPLETED') {
      logger.info(`Order already completed: ${order.orderNumber}`);
      return;
    }

    // Update order status
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
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

      // Create notification
      await tx.notification.create({
        data: {
          userId: order.customerId,
          title: 'Payment Successful',
          message: `Payment of ₦${order.amount} for order ${order.orderNumber} was successful`,
          type: 'SUCCESS',
        },
      });
    });

    logger.info(`Payment processed for order: ${order.orderNumber}`);
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(data: any) {
    const orderId = data.metadata?.orderId;

    if (!orderId) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    // Create notification
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        title: 'Payment Failed',
        message: `Payment for order ${order.orderNumber} failed. Please try again.`,
        type: 'ERROR',
      },
    });

    logger.warn(`Payment failed for order: ${order.orderNumber}`);
  }
}



