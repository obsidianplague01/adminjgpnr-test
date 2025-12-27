// src/modules/analytics/analytics.controller.ts
import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { asyncHandler } from '../../middleware/errorHandler';

const analyticsService = new AnalyticsService();

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

export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await analyticsService.getDashboardOverview();
  res.json(overview);
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;
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

