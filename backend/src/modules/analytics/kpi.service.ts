// backend/src/modules/analytics/kpi.service.ts
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { 
  DashboardKPIs, 
  DateRange, 
  TimePeriod, 
  KPIMetric,
  RevenueKPI 
} from './analytics.types';

export class KPIService {
  /**
   * Get all dashboard KPIs with comparison
   */
  async getDashboardKPIs(period: TimePeriod): Promise<DashboardKPIs> {
    const ranges = this.getDateRanges(period);

    const [revenue, tickets, customers, scanRate] = await Promise.all([
      this.getRevenueKPI(ranges.current, ranges.previous),
      this.getTicketSalesKPI(ranges.current, ranges.previous),
      this.getCustomerKPI(ranges.current, ranges.previous),
      this.getScanRateKPI(ranges.current, ranges.previous),
    ]);

    return { revenue, ticketSales: tickets, customers, scanRate };
  }

  /**
   * Revenue KPI with target tracking
   */
  private async getRevenueKPI(
    current: DateRange,
    previous: DateRange
  ): Promise<RevenueKPI> {
    const [currentRevenue, previousRevenue] = await Promise.all([
      this.getTotalRevenue(current),
      this.getTotalRevenue(previous),
    ]);

    const change = currentRevenue - previousRevenue;
    const changePercent = previousRevenue > 0 
      ? (change / previousRevenue) * 100 
      : 0;

    // Calculate target (e.g., 10% growth)
    const target = previousRevenue * 1.1;
    const targetPercent = target > 0 ? (currentRevenue / target) * 100 : 0;

    return {
      current: currentRevenue,
      previous: previousRevenue,
      change,
      changePercent: parseFloat(changePercent.toFixed(2)),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      target,
      targetPercent: parseFloat(targetPercent.toFixed(2)),
    };
  }

  /**
   * Ticket sales KPI
   */
  private async getTicketSalesKPI(
    current: DateRange,
    previous: DateRange
  ): Promise<KPIMetric> {
    const [currentCount, previousCount] = await Promise.all([
      prisma.ticket.count({
        where: { createdAt: { gte: current.start, lte: current.end } },
      }),
      prisma.ticket.count({
        where: { createdAt: { gte: previous.start, lte: previous.end } },
      }),
    ]);

    const change = currentCount - previousCount;
    const changePercent = previousCount > 0 
      ? (change / previousCount) * 100 
      : 0;

    return {
      current: currentCount,
      previous: previousCount,
      change,
      changePercent: parseFloat(changePercent.toFixed(2)),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Customer growth KPI
   */
  private async getCustomerKPI(
    current: DateRange,
    previous: DateRange
  ): Promise<KPIMetric> {
    const [currentCount, previousCount] = await Promise.all([
      prisma.customer.count({
        where: { createdAt: { gte: current.start, lte: current.end } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: previous.start, lte: previous.end } },
      }),
    ]);

    const change = currentCount - previousCount;
    const changePercent = previousCount > 0 
      ? (change / previousCount) * 100 
      : 0;

    return {
      current: currentCount,
      previous: previousCount,
      change,
      changePercent: parseFloat(changePercent.toFixed(2)),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Scan rate KPI
   */
  private async getScanRateKPI(
    current: DateRange,
    previous: DateRange
  ): Promise<KPIMetric & { scannedCount: number; totalCount: number }> {
    const [currentStats, previousStats] = await Promise.all([
      this.getScanStats(current),
      this.getScanStats(previous),
    ]);

    const change = currentStats.rate - previousStats.rate;

    return {
      current: currentStats.rate,
      previous: previousStats.rate,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(change.toFixed(2)), // Already a percentage
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      scannedCount: currentStats.scanned,
      totalCount: currentStats.total,
    };
  }

  /**
   * Helper: Get total revenue for period
   */
  private async getTotalRevenue(range: DateRange): Promise<number> {
    const result = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount) || 0;
  }

  /**
   * Helper: Get scan statistics
   */
  private async getScanStats(range: DateRange) {
    const [total, scanned] = await Promise.all([
      prisma.ticket.count({
        where: { createdAt: { gte: range.start, lte: range.end } },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: range.start, lte: range.end },
          status: 'SCANNED',
        },
      }),
    ]);

    const rate = total > 0 ? (scanned / total) * 100 : 0;

    return {
      total,
      scanned,
      rate: parseFloat(rate.toFixed(2)),
    };
  }

  /**
   * Helper: Calculate date ranges for current and previous periods
   */
  private getDateRanges(period: TimePeriod): {
    current: DateRange;
    previous: DateRange;
  } {
    const now = new Date();
    const current = { start: new Date(), end: now };
    const previous = { start: new Date(), end: new Date() };

    switch (period) {
      case TimePeriod.SEVEN_DAYS:
        current.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previous.start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previous.end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;

      case TimePeriod.THIRTY_DAYS:
        current.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previous.start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previous.end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;

      case TimePeriod.NINETY_DAYS:
        current.start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previous.start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        previous.end = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;

      case TimePeriod.ONE_YEAR:
        current.start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previous.start = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        previous.end = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    return { current, previous };
  }
}