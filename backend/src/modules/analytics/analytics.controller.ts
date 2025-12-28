// backend/src/modules/analytics/analytics.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { KPIService } from './kpi.service';
import { RevenueService } from './revenue.service';
import { PerformanceService } from './performance.service';
import { CustomerCampaignService } from './customer-campaign.service';
import { AnalyticsService } from './analytics.service';
import { cacheService } from '../../utils/cache.service';
import { TimePeriod } from './analytics.types';
import { logger } from '../../utils/logger';

const kpiService = new KPIService();
const revenueService = new RevenueService();
const performanceService = new PerformanceService();
const customerCampaignService = new CustomerCampaignService();
const analyticsService = new AnalyticsService();

export const getDashboardKPIs = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as TimePeriod) || TimePeriod.THIRTY_DAYS;
  
  const cacheKey = cacheService.generateAnalyticsKey('kpi', { period });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => kpiService.getDashboardKPIs(period),
    300
  );
  
  res.json(data);
});

export const getRevenueOverview = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as TimePeriod) || TimePeriod.THIRTY_DAYS;
  
  const cacheKey = cacheService.generateAnalyticsKey('revenue:overview', { period });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => revenueService.getRevenueOverview(period),
    300
  );
  
  res.json(data);
});

export const getRevenueBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('revenue:breakdown', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => revenueService.getRevenueBreakdown(range),
    300
  );
  
  res.json(data);
});

export const getRevenueTargets = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  
  const cacheKey = cacheService.generateAnalyticsKey('revenue:targets', { year });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => revenueService.getRevenueTargets(year),
    600
  );
  
  res.json(data);
});

export const setRevenueTarget = asyncHandler(async (req: Request, res: Response) => {
  const { month, target } = req.body;
  
  const result = await revenueService.setRevenueTarget(month, target);
  
  await cacheService.deletePattern('analytics:revenue:*');
  
  res.json(result);
});

export const updateActualRevenue = asyncHandler(async (req: Request, res: Response) => {
  const { month } = req.params;
  
  const actual = await revenueService.updateActualRevenue(month);
  
  await cacheService.deletePattern('analytics:revenue:*');
  
  res.json({ month, actual });
});

export const getTicketPerformance = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as TimePeriod) || TimePeriod.THIRTY_DAYS;
  
  const cacheKey = cacheService.generateAnalyticsKey('tickets:performance', { period });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getTicketPerformance(period),
    300
  );
  
  res.json(data);
});

export const getTicketTrends = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('tickets:trends', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getTicketTrends(range),
    300
  );
  
  res.json(data);
});

export const getSessionDistribution = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as TimePeriod) || TimePeriod.THIRTY_DAYS;
  
  const cacheKey = cacheService.generateAnalyticsKey('sessions:distribution', { period });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getSessionDistribution(period),
    600
  );
  
  res.json(data);
});

export const getSessionPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('sessions:performance', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getSessionPerformance(range),
    300
  );
  
  res.json(data);
});

export const getCustomerGrowth = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as TimePeriod) || TimePeriod.THIRTY_DAYS;
  
  const cacheKey = cacheService.generateAnalyticsKey('customers:growth', { period });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getCustomerGrowth(period),
    300
  );
  
  res.json(data);
});

export const getCustomerRetention = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('customers:retention', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getCustomerRetention(range),
    600
  );
  
  res.json(data);
});

export const getCustomerSegments = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('customers:segments', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getCustomerSegments(range),
    600
  );
  
  res.json(data);
});

export const getCampaignPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = 'analytics:campaigns:performance';
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getCampaignPerformance(),
    300
  );
  
  res.json(data);
});

export const getCampaignFunnel = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('campaigns:funnel', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getCampaignFunnel(range),
    300
  );
  
  res.json(data);
});

export const getMarketingMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('marketing:metrics', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => customerCampaignService.getMarketingMetrics(range),
    300
  );
  
  res.json(data);
});

export const getScanTrends = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('scans:trends', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getScanTrends(range),
    300
  );
  
  res.json(data);
});

export const getScansByLocation = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const range = {
    start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: endDate ? new Date(endDate as string) : new Date(),
  };
  
  const cacheKey = cacheService.generateAnalyticsKey('scans:locations', {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  });
  
  const data = await cacheService.getOrSet(
    cacheKey,
    () => performanceService.getScansByLocation(range),
    600
  );
  
  res.json(data);
});

export const comparePeriods = asyncHandler(async (req: Request, res: Response) => {
  const { currentPeriod, previousPeriod, metric } = req.query;
  
  res.json({
    message: 'Period comparison endpoint',
    currentPeriod,
    previousPeriod,
    metric,
  });
});

export const getForecast = asyncHandler(async (req: Request, res: Response) => {
  const { period, metric } = req.query;
  
  res.json({
    message: 'Forecasting endpoint',
    period,
    metric,
  });
});

export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await analyticsService.getDashboardOverview();
  res.json(overview);
});

export const getRevenueMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await analyticsService.getRevenueMetrics(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(metrics);
});

export const getTicketStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await analyticsService.getTicketStats(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(stats);
});

export const getCustomerStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await analyticsService.getCustomerStats(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(stats);
});

export const getScanStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await analyticsService.getScanStats(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(stats);
});

export const getCampaignStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await analyticsService.getCampaignStats();
  res.json(stats);
});

// Fix: Add proper type for exportData type parameter
type ExportType = 'tickets' | 'orders' | 'customers' | 'scans';

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type as ExportType;
  
  // Validate type
  const validTypes: ExportType[] = ['tickets', 'orders', 'customers', 'scans'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Invalid export type' });
    return;
  }
  
  const csv = await analyticsService.exportData(
    type,
    req.query.startDate as string,
    req.query.endDate as string
  );

  const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const exportCustomReport = asyncHandler(async (req: Request, res: Response) => {
  const { metrics, format, startDate, endDate } = req.body;
  
  logger.info('Custom report export requested', { metrics, format });
  
  res.json({
    message: 'Custom report generation',
    metrics,
    format,
    dateRange: { startDate, endDate },
  });
});

export const invalidateCache = asyncHandler(async (req: Request, res: Response) => {
  const { pattern } = req.body;
  
  if (pattern) {
    await cacheService.deletePattern(`analytics:${pattern}*`);
  } else {
    await cacheService.invalidateAllAnalytics();
  }
  
  logger.info('Analytics cache invalidated', { pattern });
  
  res.json({ message: 'Cache invalidated successfully' });
});

export const getCacheStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await cacheService.getStats();
  res.json(stats);
});