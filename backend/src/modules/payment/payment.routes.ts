// src/modules/payment/payment.routes.ts
import { Router } from 'express';
import * as paymentController from './payment.controller';
import { authenticateJWT, requireStaff } from '../../middleware/auth';
import { paymentLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import rateLimit from 'express-rate-limit';


const router = Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 50, 
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => { 
    res.status(429).json({
      error: 'Too many webhook requests',
      message: 'slow down',
    });
  },
});

router.post('/webhook', webhookLimiter, paymentController.handleWebhook);

router.use(authenticateJWT, requireStaff);

router.post(
  '/initialize/:orderId',
  paymentLimiter, 
  auditLog('INITIALIZE_PAYMENT', 'PAYMENT'),
  paymentController.initializePayment
);

router.get(
  '/verify/:reference',
  paymentLimiter,
  auditLog('VERIFY_PAYMENT', 'PAYMENT'),
  paymentController.verifyPayment
);

export default router;