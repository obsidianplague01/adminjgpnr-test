// src/modules/payment/payment.routes.ts
import { Router } from 'express';
import * as paymentController from './payment.controller';
import { authenticateJWT, requireStaff } from '../../middleware/auth';
import { paymentLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import rateLimit from 'express-rate-limit';

const router = Router();

// Webhook rate limiter (prevent DoS)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => { // Fix: Prefix req with underscore
    res.status(429).json({
      error: 'Too many webhook requests',
      message: 'Please slow down',
    });
  },
});

// Webhook (no auth - verified by signature, but rate limited)
router.post('/webhook', webhookLimiter, paymentController.handleWebhook);

// Protected routes - require staff (not just admin)
router.use(authenticateJWT, requireStaff);

// Initialize payment with strict rate limiting
router.post(
  '/initialize/:orderId',
  paymentLimiter, // 10 requests per hour per user
  auditLog('INITIALIZE_PAYMENT', 'PAYMENT'),
  paymentController.initializePayment
);

// Verify payment with moderate rate limiting
router.get(
  '/verify/:reference',
  paymentLimiter,
  auditLog('VERIFY_PAYMENT', 'PAYMENT'),
  paymentController.verifyPayment
);

export default router;