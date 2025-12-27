// src/modules/payment/payment.routes.ts
import { Router } from 'express';
import * as paymentController from './payment.controller';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';

const router = Router();

// Webhook (no auth - verified by signature)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.use(authenticateJWT, requireAdmin);

router.post(
  '/initialize/:orderId',
  auditLog('INITIALIZE_PAYMENT', 'PAYMENT'),
  paymentController.initializePayment
);

router.get('/verify/:reference', paymentController.verifyPayment);

export default router;