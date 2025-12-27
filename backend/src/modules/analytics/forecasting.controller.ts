// src/modules/analytics/forecasting.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { forecastingService } from './forecasting.service';
import { cacheService } from '../../utils/cache.service';
import { AppError } from '../../middleware/errorHandler';

export const forecastRevenue = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  
  if (days < 1 || days > 90) {
    throw new AppError(400, 'Days must be between 1 and 90');
  }
  
  const cacheKey = `forecast:revenue:${days}`;
  
  const forecast = await cacheService.getOrSet(
    cacheKey,
    () => forecastingService.forecastRevenue(days),
    3600 // Cache for 1 hour
  );
  
  res.json(forecast);
});

export const forecastTicketSales = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  
  if (days < 1 || days > 90) {
    throw new AppError(400, 'Days must be between 1 and 90');
  }
  
  const cacheKey = `forecast:tickets:${days}`;
  
  const forecast = await cacheService.getOrSet(
    cacheKey,
    () => forecastingService.forecastTicketSales(days),
    3600
  );
  
  res.json(forecast);
});

export const forecastCustomerGrowth = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  
  if (days < 1 || days > 90) {
    throw new AppError(400, 'Days must be between 1 and 90');
  }
  
  const cacheKey = `forecast:customers:${days}`;
  
  const forecast = await cacheService.getOrSet(
    cacheKey,
    () => forecastingService.forecastCustomerGrowth(days),
    3600
  );
  
  res.json(forecast);
});