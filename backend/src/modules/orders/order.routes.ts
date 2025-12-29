// src/modules/orders/order.routes.ts
import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { rateLimit } from '../../middleware/rateLimit';
import { csrfProtection } from '../../middleware/csrf';
import { UserRole } from '@prisma/client';
import * as orderController from './order.controller';
import * as orderSchema from './order.schema';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.listOrders
);

// Get specific order
router.get(
  '/:id',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrder
);

// Get order by number
router.get(
  '/number/:orderNumber',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderByNumber
);

// Get order timeline
router.get(
  '/:id/timeline',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderTimeline
);

/**
 * Customer-specific routes
 */

// Get customer's orders
router.get(
  '/customer/:customerId',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getCustomerOrders
);

// Download tickets
router.get(
  '/:id/tickets/download',
  rateLimit({ windowMs: 60000, max: 10 }),
  orderController.downloadTickets
);

// Download receipt
router.get(
  '/:id/receipt',
  rateLimit({ windowMs: 60000, max: 10 }),
  orderController.downloadReceipt
);


// Create order
router.post(
  '/',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 100 }), 
  validate(orderSchema.createOrderSchema),
  orderController.createOrder
);

// Update order
router.patch(
  '/:id',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 200 }),
  validate(orderSchema.updateOrderSchema),
  orderController.updateOrder
);

// Confirm payment
router.post(
  '/:id/confirm-payment',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 100 }),
  validate(orderSchema.confirmPaymentSchema),
  orderController.confirmPayment
);

// Cancel order
router.post(
  '/:id/cancel',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 50 }),
  orderController.cancelOrder
);

// Resend confirmation
router.post(
  '/:id/resend-confirmation',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 20 }), // 20 resends per hour
  orderController.resendConfirmation
);


// Get statistics
router.get(
  '/stats/overview',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderStats
);

// Revenue breakdown
router.get(
  '/analytics/revenue',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getRevenueBreakdown
);

// Export orders
router.get(
  '/export/csv',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 3600000, max: 10 }), // 10 exports per hour
  orderController.exportOrdersCSV
);

// Bulk create orders
router.post(
  '/bulk',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 5 }), // 5 bulk operations per hour
  orderController.bulkCreateOrders
);

// Refund order
router.post(
  '/:id/refund',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 20 }),
  orderController.refundOrder
);

// Mark as fraud
router.post(
  '/:id/mark-fraud',
  authorize([UserRole.SUPER_ADMIN]), // Super admin only
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 10 }),
  orderController.markAsFraud
);

export default router;