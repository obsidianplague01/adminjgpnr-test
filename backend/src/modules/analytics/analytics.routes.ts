// src/modules/analytics/analytics.routes.ts
import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { exportLimiter } from '../../middleware/rateLimit';

const router = Router();

router.use(authenticateJWT, requireAdmin);

router.get('/dashboard', analyticsController.getDashboardOverview);

router.get('/revenue', analyticsController.getRevenueMetrics);
router.get('/tickets', analyticsController.getTicketStats);
router.get('/customers', analyticsController.getCustomerStats);
router.get('/scans', analyticsController.getScanStats);
router.get('/campaigns', analyticsController.getCampaignStats);

router.post('/export/:type', exportLimiter, analyticsController.exportData);

export default router;