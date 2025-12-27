// backend/src/modules/analytics/performance.service.ts
import { TicketStatus } from '@prisma/client';
import prisma from '../../config/database';
import { 
  TicketPerformance, 
  SessionDistribution,
  DateRange,
  TimePeriod 
} from './analytics.types';
import { format, eachMonthOfInterval } from 'date-fns';

export class PerformanceService {
  /**
   * Get ticket performance metrics
   */
  async getTicketPerformance(period: TimePeriod): Promise<TicketPerformance> {
    const range = this.getDateRange(period);
    
    // Get all tickets in range
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Generate months in range
    const months = eachMonthOfInterval({ start: range.start, end: range.end });
    
    // Group by month and status
    const monthlyData = months.map(monthDate => {
      const month = format(monthDate, 'yyyy-MM');
      
      const monthTickets = tickets.filter(t => 
        format(t.createdAt, 'yyyy-MM') === month
      );

      return {
        month,
        active: monthTickets.filter(t => t.status === TicketStatus.ACTIVE).length,
        scanned: monthTickets.filter(t => t.status === TicketStatus.SCANNED).length,
        cancelled: monthTickets.filter(t => t.status === TicketStatus.CANCELLED).length,
        expired: monthTickets.filter(t => t.status === TicketStatus.EXPIRED).length,
      };
    });

    // Calculate summary
    const totalActive = tickets.filter(t => t.status === TicketStatus.ACTIVE).length;
    const totalScanned = tickets.filter(t => t.status === TicketStatus.SCANNED).length;
    const scanRate = tickets.length > 0 
      ? (totalScanned / tickets.length) * 100 
      : 0;

    return {
      monthly: monthlyData,
      summary: {
        totalActive,
        totalScanned,
        scanRate: parseFloat(scanRate.toFixed(2)),
      },
    };
  }

  /**
   * Get ticket trends and insights
   */
  async getTicketTrends(range: DateRange) {
    const [
      totalTickets,
      statusBreakdown,
      avgScanTime,
      scanEfficiency,
      expiringTickets,
      utilizationRate,
    ] = await Promise.all([
      this.getTotalTickets(range),
      this.getStatusBreakdown(range),
      this.getAvgScanTime(range),
      this.getScanEfficiency(range),
      this.getExpiringTickets(),
      this.getUtilizationRate(range),
    ]);

    return {
      totalTickets,
      statusBreakdown,
      avgScanTime,
      scanEfficiency,
      expiringTickets,
      utilizationRate,
    };
  }

  /**
   * Get session distribution
   */
  async getSessionDistribution(period: TimePeriod): Promise<SessionDistribution> {
    const range = this.getDateRange(period);

    const tickets = await prisma.ticket.groupBy({
      by: ['gameSession'],
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: true,
      orderBy: {
        _count: {
          gameSession: 'desc',
        },
      },
    });

    const total = tickets.reduce((sum, t) => sum + t._count, 0);

    const sessions = tickets.map(t => ({
      name: t.gameSession,
      count: t._count,
      percentage: total > 0 ? parseFloat(((t._count / total) * 100).toFixed(2)) : 0,
    }));

    return { sessions, total };
  }

  /**
   * Get session performance details
   */
  async getSessionPerformance(range: DateRange) {
    const sessions = await prisma.ticket.groupBy({
      by: ['gameSession'],
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: true,
      _avg: {
        scanCount: true,
      },
    });

    // Get revenue per session
    const sessionRevenue = await this.getRevenueBySession(range);
    const revenueMap = new Map(sessionRevenue.map(s => [s.session, s.revenue]));

    return sessions.map(session => {
      const revenue = revenueMap.get(session.gameSession) || 0;
      const avgRevenue = session._count > 0 ? revenue / session._count : 0;

      return {
        session: session.gameSession,
        ticketsSold: session._count,
        avgScanCount: Number(session._avg.scanCount) || 0,
        totalRevenue: revenue,
        avgRevenuePerTicket: parseFloat(avgRevenue.toFixed(2)),
        scanRate: this.calculateSessionScanRate(session.gameSession, range),
      };
    });
  }

  /**
   * Get scan location analytics
   */
  async getScansByLocation(range: DateRange) {
    const scans = await prisma.ticketScan.groupBy({
      by: ['location'],
      where: {
        scannedAt: { gte: range.start, lte: range.end },
        location: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          location: 'desc',
        },
      },
    });

    return scans.map(scan => ({
      location: scan.location || 'Unknown',
      count: scan._count,
    }));
  }

  /**
   * Get scan trends over time
   */
  async getScanTrends(range: DateRange) {
    const scans = await prisma.ticketScan.findMany({
      where: {
        scannedAt: { gte: range.start, lte: range.end },
      },
      select: {
        scannedAt: true,
        allowed: true,
      },
      orderBy: { scannedAt: 'asc' },
    });

    const dailyMap = new Map<string, { total: number; allowed: number }>();

    for (const scan of scans) {
      const day = format(scan.scannedAt, 'yyyy-MM-dd');
      const current = dailyMap.get(day) || { total: 0, allowed: 0 };
      
      dailyMap.set(day, {
        total: current.total + 1,
        allowed: current.allowed + (scan.allowed ? 1 : 0),
      });
    }

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        allowed: stats.allowed,
        denied: stats.total - stats.allowed,
        successRate: stats.total > 0 
          ? parseFloat(((stats.allowed / stats.total) * 100).toFixed(2)) 
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ===== PRIVATE HELPER METHODS =====

  private async getTotalTickets(range: DateRange): Promise<number> {
    return await prisma.ticket.count({
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
    });
  }

  private async getStatusBreakdown(range: DateRange) {
    const breakdown = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: true,
    });

    return breakdown.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getAvgScanTime(range: DateRange): Promise<number> {
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        firstScanAt: { not: null },
      },
      select: {
        createdAt: true,
        firstScanAt: true,
      },
    });

    if (tickets.length === 0) return 0;

    const totalHours = tickets.reduce((sum, ticket) => {
      const hours = (ticket.firstScanAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return parseFloat((totalHours / tickets.length).toFixed(2));
  }

  private async getScanEfficiency(range: DateRange) {
    const [total, scanned, avgScans] = await Promise.all([
      prisma.ticket.count({
        where: { createdAt: { gte: range.start, lte: range.end } },
      }),
      prisma.ticket.count({
        where: { 
          createdAt: { gte: range.start, lte: range.end },
          scanCount: { gt: 0 },
        },
      }),
      prisma.ticket.aggregate({
        where: { createdAt: { gte: range.start, lte: range.end } },
        _avg: { scanCount: true },
      }),
    ]);

    return {
      utilizationRate: total > 0 ? ((scanned / total) * 100).toFixed(2) : '0.00',
      avgScansPerTicket: Number(avgScans._avg.scanCount) || 0,
    };
  }

  private async getExpiringTickets(): Promise<number> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return await prisma.ticket.count({
      where: {
        status: TicketStatus.ACTIVE,
        validUntil: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
      },
    });
  }

  private async getUtilizationRate(range: DateRange) {
    const [totalScans, totalPossibleScans] = await Promise.all([
      prisma.ticket.aggregate({
        where: { createdAt: { gte: range.start, lte: range.end } },
        _sum: { scanCount: true },
      }),
      prisma.ticket.aggregate({
        where: { createdAt: { gte: range.start, lte: range.end } },
        _sum: { maxScans: true },
      }),
    ]);

    const actual = Number(totalScans._sum.scanCount) || 0;
    const possible = Number(totalPossibleScans._sum.maxScans) || 1;

    return parseFloat(((actual / possible) * 100).toFixed(2));
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

    return Array.from(sessionMap.entries()).map(([session, revenue]) => ({
      session,
      revenue,
    }));
  }

  private async calculateSessionScanRate(session: string, range: DateRange): Promise<number> {
    const [total, scanned] = await Promise.all([
      prisma.ticket.count({
        where: {
          gameSession: session,
          createdAt: { gte: range.start, lte: range.end },
        },
      }),
      prisma.ticket.count({
        where: {
          gameSession: session,
          createdAt: { gte: range.start, lte: range.end },
          status: TicketStatus.SCANNED,
        },
      }),
    ]);

    return total > 0 ? parseFloat(((scanned / total) * 100).toFixed(2)) : 0;
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
}