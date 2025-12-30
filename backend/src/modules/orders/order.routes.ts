// src/modules/orders/order.routes.ts
import express from 'express';
import { authenticate, requireAdmin, requireStaff, requireSuperAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { refundOrderSchema } from './order.schema';
import { apiLimiter } from '../../middleware/rateLimit';
import { csrfProtection } from '../../middleware/csrf';
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
  requireStaff,
  csrfProtection,
  apiLimiter, 
  validate(orderSchema.createOrderSchema),
  orderController.createOrder
);

router.patch(
  '/:id',
  requireStaff,
  csrfProtection,
  apiLimiter,
  validate(orderSchema.updateOrderSchema),
  orderController.updateOrder
);

router.post(
  '/:id/confirm-payment',
  requireAdmin,
  csrfProtection,
  apiLimiter,
  validate(orderSchema.confirmPaymentSchema),
  orderController.confirmPayment
);

router.post(
  '/:id/cancel',
  requireAdmin,
  csrfProtection,
  apiLimiter,
  orderController.cancelOrder
);

router.post(
  '/:id/resend-confirmation',
  requireStaff,
  csrfProtection,
  apiLimiter,
  orderController.resendConfirmation
);

router.get(
  '/stats/overview',
  requireAdmin,
  apiLimiter,
  orderController.getOrderStats
);

router.get(
  '/analytics/revenue',
  requireAdmin,
  apiLimiter,
  orderController.getRevenueBreakdown
);

router.get(
  '/export/csv',
  requireAdmin,
  apiLimiter,
  orderController.exportOrdersCSV
);
router.post(
  '/:id/refund',
  authenticate,
  requireAdmin, 
  validate(refundOrderSchema),
  orderController.refundOrder
);

router.post(
  '/bulk',
  requireAdmin,
  csrfProtection,
  apiLimiter, 
  orderController.bulkCreateOrders
);

router.post(
  '/:id/refund',
  requireAdmin,
  csrfProtection,
  apiLimiter,
  orderController.refundOrder
);

router.post(
  '/:id/mark-fraud',
  requireSuperAdmin,
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