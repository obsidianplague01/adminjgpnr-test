// src/modules/orders/order.routes.ts
import { Router } from 'express';
import * as orderController from './order.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { orderLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import {
  createOrderSchema,
  updateOrderSchema,
  confirmPaymentSchema,
  listOrdersSchema,
} from './order.schema';

const router = Router();

// All order routes require authentication
router.use(authenticateJWT);

// List orders
router.get(
  '/',
  validate(listOrdersSchema),
  orderController.listOrders
);

// Get order stats
router.get('/stats', orderController.getOrderStats);

// Get single order
router.get('/:id', orderController.getOrder);

// Get order by order number
router.get('/number/:orderNumber', orderController.getOrderByNumber);

// Create order (Admin+, rate limited)
router.post(
  '/',
  requireAdmin,
  orderLimiter,
  validate(createOrderSchema),
  auditLog('CREATE_ORDER', 'ORDER'),
  orderController.createOrder
);

// Update order (Admin+)
router.patch(
  '/:id',
  requireAdmin,
  validate(updateOrderSchema),
  auditLog('UPDATE_ORDER', 'ORDER'),
  orderController.updateOrder
);

// Confirm payment (Admin+)
router.post(
  '/:id/confirm',
  requireAdmin,
  validate(confirmPaymentSchema),
  auditLog('CONFIRM_PAYMENT', 'ORDER'),
  orderController.confirmPayment
);

// Cancel order (Admin+)
router.delete(
  '/:id',
  requireAdmin,
  auditLog('CANCEL_ORDER', 'ORDER'),
  orderController.cancelOrder
);

export default router;