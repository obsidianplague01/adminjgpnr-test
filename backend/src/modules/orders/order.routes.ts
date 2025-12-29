// src/modules/orders/order.routes.ts
import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { apiLimiter } from '../../middleware/rateLimit';
import { csrfProtection } from '../../middleware/csrf';
import { UserRole } from '@prisma/client';
import * as orderController from './order.controller';
import * as orderSchema from './order.schema';
import { fileDownloadLimiter } from '../../middleware/rateLimit';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  apiLimiter,
  orderController.listOrders
);

router.get(
  '/:id',
  apiLimiter,
  orderController.getOrder
);

router.get(
  '/number/:orderNumber',
  apiLimiter,
  orderController.getOrderByNumber
);

router.get(
  '/:id/timeline',
  apiLimiter,
  orderController.getOrderTimeline
);

router.get(
  '/customer/:customerId',
  apiLimiter,
  orderController.getCustomerOrders
);

router.get(
  '/:id/tickets/download',
  apiLimiter,
  orderController.downloadTickets
);

router.get(
  '/:id/receipt',
  apiLimiter,
  orderController.downloadReceipt
);

router.post(
  '/',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter, 
  validate(orderSchema.createOrderSchema),
  orderController.createOrder
);

router.patch(
  '/:id',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter,
  validate(orderSchema.updateOrderSchema),
  orderController.updateOrder
);

router.post(
  '/:id/confirm-payment',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter,
  validate(orderSchema.confirmPaymentSchema),
  orderController.confirmPayment
);

router.post(
  '/:id/cancel',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter,
  orderController.cancelOrder
);

router.post(
  '/:id/resend-confirmation',
  authorize([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter,
  orderController.resendConfirmation
);

router.get(
  '/stats/overview',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
 apiLimiter,
  orderController.getOrderStats
);

router.get(
  '/analytics/revenue',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  apiLimiter,
  orderController.getRevenueBreakdown
);

router.get(
  '/export/csv',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  apiLimiter,
  orderController.exportOrdersCSV
);

router.post(
  '/bulk',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter, 
  orderController.bulkCreateOrders
);

router.post(
  '/:id/refund',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  csrfProtection,
  apiLimiter,
  orderController.refundOrder
);

router.post(
  '/:id/mark-fraud',
  authorize([UserRole.SUPER_ADMIN]), // Super admin only
  csrfProtection,
  apiLimiter,
  orderController.markAsFraud
);

router.post('/:id/tickets/download', 
  authenticate,
  csrfProtection,
  fileDownloadLimiter,
  orderController.downloadTickets
);
export default router;