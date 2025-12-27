// backend/src/modules/analytics/analytics.routes.ts (ENHANCED)
import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { cache } from '../../middleware/cache';
import { exportLimiter } from '../../middleware/rateLimit';
import { analyticsQuerySchema } from './analytics.schema';

const router = Router();
router.use(authenticateJWT, requireAdmin);

// ===== DASHBOARD KPIs =====
router.get(
  '/kpi',
  validate(analyticsQuerySchema),
  cache({ ttl: 300, prefix: 'analytics:kpi' }),
  analyticsController.getDashboardKPIs
);

// ===== REVENUE ANALYTICS =====
router.get(
  '/revenue/overview',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getRevenueOverview
);

router.get(
  '/revenue/breakdown',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getRevenueBreakdown
);

router.get(
  '/revenue/targets',
  cache({ ttl: 600 }),
  analyticsController.getRevenueTargets
);

// ===== TICKET PERFORMANCE =====
router.get(
  '/tickets/performance',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getTicketPerformance
);

router.get(
  '/tickets/trends',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getTicketTrends
);

// ===== SESSION ANALYTICS =====
router.get(
  '/sessions/distribution',
  validate(analyticsQuerySchema),
  cache({ ttl: 600 }),
  analyticsController.getSessionDistribution
);

router.get(
  '/sessions/performance',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getSessionPerformance
);

// ===== CUSTOMER ANALYTICS =====
router.get(
  '/customers/growth',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getCustomerGrowth
);

router.get(
  '/customers/retention',
  validate(analyticsQuerySchema),
  cache({ ttl: 600 }),
  analyticsController.getCustomerRetention
);

router.get(
  '/customers/segments',
  validate(analyticsQuerySchema),
  cache({ ttl: 600 }),
  analyticsController.getCustomerSegments
);

// ===== CAMPAIGN ANALYTICS =====
router.get(
  '/campaigns/performance',
  cache({ ttl: 300 }),
  analyticsController.getCampaignPerformance
);

router.get(
  '/campaigns/funnel',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getCampaignFunnel
);

// ===== MARKETING METRICS =====
router.get(
  '/marketing/metrics',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getMarketingMetrics
);

// ===== SCAN ANALYTICS =====
router.get(
  '/scans/trends',
  validate(analyticsQuerySchema),
  cache({ ttl: 300 }),
  analyticsController.getScanTrends
);

router.get(
  '/scans/locations',
  validate(analyticsQuerySchema),
  cache({ ttl: 600 }),
  analyticsController.getScansByLocation
);

// ===== COMPARISON & FORECASTING =====
router.get(
  '/compare',
  validate(analyticsQuerySchema),
  cache({ ttl: 600 }),
  analyticsController.comparePeriods
);

router.get(
  '/forecast',
  validate(analyticsQuerySchema),
  cache({ ttl: 3600 }), // 1 hour cache
  analyticsController.getForecast
);

// ===== EXISTING ENDPOINTS (Keep for backward compatibility) =====
router.get('/dashboard', analyticsController.getDashboardOverview);
router.get('/revenue', analyticsController.getRevenueMetrics);
router.get('/tickets', analyticsController.getTicketStats);
router.get('/customers', analyticsController.getCustomerStats);
router.get('/scans', analyticsController.getScanStats);
router.get('/campaigns', analyticsController.getCampaignStats);

// ===== EXPORTS =====
router.post(
  '/export/:type',
  exportLimiter,
  validate(analyticsQuerySchema),
  analyticsController.exportData
);

router.post(
  '/export/custom',
  exportLimiter,
  analyticsController.exportCustomReport
);

export default router;