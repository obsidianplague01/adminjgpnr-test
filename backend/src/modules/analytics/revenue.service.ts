// backend/src/modules/analytics/revenue.service.ts
import prisma from '../../config/database';
import { 
  RevenueOverview, 
  MonthlyDataPoint, 
  DateRange,
  TimePeriod 
} from './analytics.types';
import { logger } from '../../utils/logger';
import {endOfMonth, format, eachMonthOfInterval } from 'date-fns';

export class RevenueService {
  /**
   * Get revenue overview with monthly breakdown
   */
  async getRevenueOverview(period: TimePeriod): Promise<RevenueOverview> {
    const range = this.getDateRange(period);
    
    // Get monthly revenue data
    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      select: {
        amount: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'asc' },
    });

    // Get targets for the period
    const monthsInRange = eachMonthOfInterval({ start: range.start, end: range.end });
    const targetMonths = monthsInRange.map(m => format(m, 'yyyy-MM'));
    
    const targets = await prisma.revenueTarget.findMany({
      where: { month: { in: targetMonths } },
    });

    const targetMap = new Map(targets.map(t => [t.month, Number(t.target)]));

    // Group by month
    const monthlyMap = new Map<string, number>();
    
    for (const order of orders) {
      const month = format(order.purchaseDate, 'yyyy-MM');
      const current = monthlyMap.get(month) || 0;
      monthlyMap.set(month, current + Number(order.amount));
    }

    // Build monthly data points
    const monthly: MonthlyDataPoint[] = monthsInRange.map(monthDate => {
      const month = format(monthDate, 'yyyy-MM');
      const value = monthlyMap.get(month) || 0;
      const target = targetMap.get(month);

      return { month, value, target };
    });

    // Calculate totals
    const total = Array.from(monthlyMap.values()).reduce((sum, val) => sum + val, 0);
    const average = monthly.length > 0 ? total / monthly.length : 0;
    const peak = monthly.reduce(
      (max, curr) => (curr.value > max.value ? curr : max),
      { month: '', value: 0 }
    );

    return {
      monthly,
      total,
      average: parseFloat(average.toFixed(2)),
      peak,
    };
  }

  /**
   * Get detailed revenue breakdown
   */
  async getRevenueBreakdown(range: DateRange) {
    const [
      totalRevenue,
      orderCount,
      avgOrderValue,
      bySession,
      byCustomerSegment,
      dailyTrend,
    ] = await Promise.all([
      this.getTotalRevenue(range),
      this.getOrderCount(range),
      this.getAvgOrderValue(range),
      this.getRevenueBySession(range),
      this.getRevenueByCustomerSegment(range),
      this.getDailyRevenueTrend(range),
    ]);

    return {
      summary: {
        totalRevenue,
        orderCount,
        avgOrderValue,
      },
      bySession,
      byCustomerSegment,
      dailyTrend,
    };
  }

  /**
   * Get revenue vs targets
   */
  async getRevenueTargets(year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    const targets = await prisma.revenueTarget.findMany({
      where: {
        month: {
          startsWith: targetYear.toString(),
        },
      },
      orderBy: { month: 'asc' },
    });

    // Calculate achievement percentages
    return targets.map(target => {
      const targetValue = Number(target.target);
      const actualValue = Number(target.actual);
      
      return {
        month: target.month,
        target: targetValue,
        actual: actualValue,
        achievement: targetValue > 0 
          ? (actualValue / targetValue) * 100 
          : 0,
        status: this.getTargetStatus(actualValue, targetValue),
      };
    });
  }

  /**
   * Update revenue target
   */
  async setRevenueTarget(month: string, target: number) {
    return await prisma.revenueTarget.upsert({
      where: { month },
      update: { target },
      create: { month, target },
    });
  }

  /**
   * Update actual revenue for a month (called after orders completed)
   */
  async updateActualRevenue(month: string) {
    const start = new Date(`${month}-01`);
    const end = endOfMonth(start);

    const result = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const actual = Number(result._sum.amount) || 0;

    await prisma.revenueTarget.upsert({
      where: { month },
      update: { actual },
      create: { 
        month, 
        target: 0, // Will be set manually
        actual,
      },
    });

    logger.info(`Updated actual revenue for ${month}: ${actual}`);
    return actual;
  }

  // ===== PRIVATE HELPER METHODS =====

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

  private async getOrderCount(range: DateRange): Promise<number> {
    return await prisma.order.count({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
    });
  }

  private async getAvgOrderValue(range: DateRange): Promise<number> {
    const result = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      _avg: { amount: true },
    });

    return Number(result._avg.amount) || 0;
  }

  private async getRevenueBySession(range: DateRange) {
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        order: { status: 'COMPLETED' },
      },
      include: {
        order: {
          select: { amount: true, quantity: true },
        },
      },
    });

    const sessionMap = new Map<string, number>();

    for (const ticket of tickets) {
      const revenue = Number(ticket.order.amount) / ticket.order.quantity;
      const current = sessionMap.get(ticket.gameSession) || 0;
      sessionMap.set(ticket.gameSession, current + revenue);
    }

    return Array.from(sessionMap.entries())
      .map(([session, revenue]) => ({ session, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getRevenueByCustomerSegment(range: DateRange) {
    const customers = await prisma.customer.findMany({
      where: {
        orders: {
          some: {
            status: 'COMPLETED',
            purchaseDate: { gte: range.start, lte: range.end },
          },
        },
      },
      include: {
        orders: {
          where: {
            status: 'COMPLETED',
            purchaseDate: { gte: range.start, lte: range.end },
          },
          select: { amount: true },
        },
      },
    });

    // Segment by total spent
    const segments = {
      high: { count: 0, revenue: 0 }, // >50k
      medium: { count: 0, revenue: 0 }, // 10k-50k
      low: { count: 0, revenue: 0 }, // <10k
    };

    for (const customer of customers) {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum + Number(order.amount),
        0
      );

      if (totalSpent > 50000) {
        segments.high.count++;
        segments.high.revenue += totalSpent;
      } else if (totalSpent >= 10000) {
        segments.medium.count++;
        segments.medium.revenue += totalSpent;
      } else {
        segments.low.count++;
        segments.low.revenue += totalSpent;
      }
    }

    return segments;
  }

  private async getDailyRevenueTrend(range: DateRange) {
    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      select: {
        amount: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'asc' },
    });

    const dailyMap = new Map<string, number>();

    for (const order of orders) {
      const day = format(order.purchaseDate, 'yyyy-MM-dd');
      const current = dailyMap.get(day) || 0;
      dailyMap.set(day, current + Number(order.amount));
    }

    return Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getDateRange(period: TimePeriod): DateRange {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case TimePeriod.SEVEN_DAYS:
        start.setDate(now.getDate() - 7);
        break;
      case TimePeriod.THIRTY_DAYS:
        start.setDate(now.getDate() - 30);
        break;
      case TimePeriod.NINETY_DAYS:
        start.setDate(now.getDate() - 90);
        break;
      case TimePeriod.ONE_YEAR:
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now };
  }

  private getTargetStatus(actual: number, target: number): 'success' | 'warning' | 'danger' {
    if (target === 0) return 'warning';
    
    const percentage = (actual / target) * 100;
    
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  }
}