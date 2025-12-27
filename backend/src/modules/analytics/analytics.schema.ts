// backend/src/modules/analytics/analytics.schema.ts
import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
  }).refine(
    (data) => {
      // If custom dates provided, both must be present
      if (data.startDate || data.endDate) {
        return data.startDate && data.endDate;
      }
      return true;
    },
    {
      message: 'Both startDate and endDate must be provided for custom range',
    }
  ).refine(
    (data) => {
      // Validate date range is logical
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
    }
  ).refine(
    (data) => {
      // Prevent future dates
      if (data.endDate) {
        const end = new Date(data.endDate);
        return end <= new Date();
      }
      return true;
    },
    {
      message: 'endDate cannot be in the future',
    }
  ).refine(
    (data) => {
      // Limit range to 2 years max
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return diffYears <= 2;
      }
      return true;
    },
    {
      message: 'Date range cannot exceed 2 years',
    }
  ),
});

export const comparisonQuerySchema = z.object({
  query: z.object({
    currentPeriod: z.enum(['7d', '30d', '90d', '1y']),
    previousPeriod: z.enum(['7d', '30d', '90d', '1y']).optional(),
    metric: z.enum(['revenue', 'tickets', 'customers', 'scans']).optional(),
  }),
});

export const exportQuerySchema = z.object({
  query: z.object({
    type: z.enum(['orders', 'tickets', 'customers', 'scans', 'campaigns']),
    format: z.enum(['csv', 'excel', 'pdf']).optional().default('csv'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  params: z.object({
    type: z.enum(['orders', 'tickets', 'customers', 'scans', 'campaigns']),
  }),
});

export const revenueTargetSchema = z.object({
  body: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    target: z.number().positive('Target must be positive'),
  }),
});

export const updateRevenueTargetSchema = z.object({
  body: z.object({
    target: z.number().positive('Target must be positive').optional(),
    actual: z.number().nonnegative('Actual must be non-negative').optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid target ID'),
  }),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>['query'];
export type ComparisonQueryInput = z.infer<typeof comparisonQuerySchema>['query'];
export type ExportQueryInput = z.infer<typeof exportQuerySchema>['query'];
export type RevenueTargetInput = z.infer<typeof revenueTargetSchema>['body'];
export type UpdateRevenueTargetInput = z.infer<typeof updateRevenueTargetSchema>['body'];