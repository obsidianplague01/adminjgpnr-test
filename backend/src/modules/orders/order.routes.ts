// src/modules/orders/order.routes.ts
import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { rateLimit } from '../../middleware/rateLimit';
import { csrfProtection } from '../../middleware/csrf';
import { UserRole } from '@prisma/client';
import * as orderController from './order.controller';
import * as orderSchema from './order.schema';
import { fileDownloadLimiter } from '../../middleware/rateLimit';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.listOrders
);

router.get(
  '/:id',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrder
);

router.get(
  '/number/:orderNumber',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderByNumber
);

router.get(
  '/:id/timeline',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderTimeline
);

router.get(
  '/customer/:customerId',
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getCustomerOrders
);

router.get(
  '/:id/tickets/download',
  rateLimit({ windowMs: 60000, max: 10 }),
  orderController.downloadTickets
);

router.get(
  '/:id/receipt',
  rateLimit({ windowMs: 60000, max: 10 }),
  orderController.downloadReceipt
);

router.post(
  '/',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 100 }), 
  validate(orderSchema.createOrderSchema),
  orderController.createOrder
);

router.patch(
  '/:id',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 200 }),
  validate(orderSchema.updateOrderSchema),
  orderController.updateOrder
);

router.post(
  '/:id/confirm-payment',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 100 }),
  validate(orderSchema.confirmPaymentSchema),
  orderController.confirmPayment
);

router.post(
  '/:id/cancel',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 50 }),
  orderController.cancelOrder
);

router.post(
  '/:id/resend-confirmation',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 20 }), // 20 resends per hour
  orderController.resendConfirmation
);

router.get(
  '/stats/overview',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getOrderStats
);

router.get(
  '/analytics/revenue',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 60000, max: 100 }),
  orderController.getRevenueBreakdown
);

router.get(
  '/export/csv',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  rateLimit({ windowMs: 3600000, max: 10 }), // 10 exports per hour
  orderController.exportOrdersCSV
);

router.post(
  '/bulk',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 5 }), // 5 bulk operations per hour
  orderController.bulkCreateOrders
);

router.post(
  '/:id/refund',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 20 }),
  orderController.refundOrder
);

router.post(
  '/:id/mark-fraud',
  authorize([UserRole.SUPER_ADMIN]), // Super admin only
  csrfProtection,
  rateLimit({ windowMs: 3600000, max: 10 }),
  orderController.markAsFraud
);

router.post('/:id/tickets/download', 
  authenticate,
  csrfProtection,
  fileDownloadLimiter,
  orderController.downloadTickets
);
export default router;