// src/modules/analytics/analytics.routes.ts - FIXED
import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { cache } from '../../middleware/cache';
import { exportLimiter, apiLimiter } from '../../middleware/rateLimit';
import { analyticsQuerySchema } from './analytics.schema';
import * as forecastingController from './forecasting.controller';
import * as excelExportController from './excel-export.controller';

const router = Router();

// All analytics routes require admin authentication
router.use(authenticateJWT, requireAdmin);

// Apply rate limiting to all analytics endpoints
router.use(apiLimiter);

// ===== DASHBOARD KPIs =====
router.get(
  '/kpi',
  validate(analyticsQuerySchema),
  cache(300), // 5 minutes cache
  analyticsController.getDashboardKPIs
);

// ===== REVENUE ANALYTICS =====
router.get(
  '/revenue/overview',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getRevenueOverview
);

router.get(
  '/revenue/breakdown',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getRevenueBreakdown
);

router.get(
  '/revenue/targets',
  cache(600), // 10 minutes
  analyticsController.getRevenueTargets
);

// ===== TICKET PERFORMANCE =====
router.get(
  '/tickets/performance',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getTicketPerformance
);

router.get(
  '/tickets/trends',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getTicketTrends
);

// ===== SESSION ANALYTICS =====
router.get(
  '/sessions/distribution',
  validate(analyticsQuerySchema),
  cache(600),
  analyticsController.getSessionDistribution
);

router.get(
  '/sessions/performance',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getSessionPerformance
);

// ===== CUSTOMER ANALYTICS =====
router.get(
  '/customers/growth',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getCustomerGrowth
);

router.get(
  '/customers/retention',
  validate(analyticsQuerySchema),
  cache(600),
  analyticsController.getCustomerRetention
);

router.get(
  '/customers/segments',
  validate(analyticsQuerySchema),
  cache(600),
  analyticsController.getCustomerSegments
);

// ===== CAMPAIGN ANALYTICS =====
router.get(
  '/campaigns/performance',
  cache(300),
  analyticsController.getCampaignPerformance
);

router.get(
  '/campaigns/funnel',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getCampaignFunnel
);

// ===== MARKETING METRICS =====
router.get(
  '/marketing/metrics',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getMarketingMetrics
);

// ===== SCAN ANALYTICS =====
router.get(
  '/scans/trends',
  validate(analyticsQuerySchema),
  cache(300),
  analyticsController.getScanTrends
);

router.get(
  '/scans/locations',
  validate(analyticsQuerySchema),
  cache(600),
  analyticsController.getScansByLocation
);

// ===== COMPARISON & FORECASTING =====
router.get(
  '/compare',
  validate(analyticsQuerySchema),
  cache(600),
  analyticsController.comparePeriods
);

router.get(
  '/forecast',
  validate(analyticsQuerySchema),
  cache(3600), // 1 hour cache for forecasts
  analyticsController.getForecast
);

router.get(
  '/forecast/revenue',
  validate(analyticsQuerySchema),
  cache(3600),
  forecastingController.forecastRevenue
);

router.get(
  '/forecast/tickets',
  validate(analyticsQuerySchema),
  cache(3600),
  forecastingController.forecastTicketSales
);

router.get(
  '/forecast/customers',
  validate(analyticsQuerySchema),
  cache(3600),
  forecastingController.forecastCustomerGrowth
);

// ===== EXISTING ENDPOINTS (Keep for backward compatibility) =====
router.get('/dashboard', cache(300), analyticsController.getDashboardOverview);
router.get('/revenue', cache(300), analyticsController.getRevenueMetrics);
router.get('/tickets', cache(300), analyticsController.getTicketStats);
router.get('/customers', cache(300), analyticsController.getCustomerStats);
router.get('/scans', cache(300), analyticsController.getScanStats);
router.get('/campaigns', cache(300), analyticsController.getCampaignStats);

// ===== EXPORTS (STRICT RATE LIMITING) =====
router.post(
  '/export/:type',
  exportLimiter, // 2 requests per minute
  validate(analyticsQuerySchema),
  analyticsController.exportData
);

router.post(
  '/export/custom',
  exportLimiter,
  analyticsController.exportCustomReport
);

router.post(
  '/export/excel',
  exportLimiter,
  excelExportController.exportAnalyticsExcel
);

export default router;