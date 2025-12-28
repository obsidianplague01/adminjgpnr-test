// src/modules/analytics/analytics.service.ts 
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { Parser } from 'json2csv';

const validateDate = (dateString: string | undefined, fieldName: string): Date | undefined => {
  if (!dateString) return undefined;
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName} format`);
  }
  
  if (date > new Date()) {
    throw new AppError(400, `${fieldName} cannot be in the future`);
  }
  
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  
  if (date < tenYearsAgo) {
    throw new AppError(400, `${fieldName} cannot be more than 10 years in the past`);
  }
  
  return date;
};

const validateDateRange = (startDate?: Date, endDate?: Date): void => {
  if (startDate && endDate && startDate > endDate) {
    throw new AppError(400, 'Start date must be before end date');
  }
  
  if (startDate && endDate) {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 365) {
      throw new AppError(400, 'Date range cannot exceed 365 days');
    }
  }
};

export class AnalyticsService {
  async getDashboardOverview(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const dateFilter: Prisma.OrderWhereInput = {};
    if (start || end) {
      dateFilter.purchaseDate = {};
      if (start) dateFilter.purchaseDate.gte = start;
      if (end) dateFilter.purchaseDate.lte = end;
    }

    // Fix: Create separate date filter for Ticket model
    const ticketDateFilter: Prisma.TicketWhereInput = {};
    if (start || end) {
      ticketDateFilter.createdAt = {};
      if (start) ticketDateFilter.createdAt.gte = start;
      if (end) ticketDateFilter.createdAt.lte = end;
    }

    const [
      totalRevenue,
      totalOrders,
      totalTickets,
      totalCustomers,
      activeTickets,
      scannedTickets,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { ...dateFilter, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.order.count({ where: dateFilter }),
      prisma.ticket.count({ where: ticketDateFilter }), // Fix: Use ticketDateFilter
      prisma.customer.count(),
      prisma.ticket.count({ where: { status: 'ACTIVE' } }),
      prisma.ticket.count({ where: { status: 'SCANNED' } }),
    ]);

    return {
      revenue: totalRevenue._sum.amount || 0,
      orders: totalOrders,
      tickets: totalTickets,
      customers: totalCustomers,
      activeTickets,
      scannedTickets,
    };
  }

  // ... rest of the methods remain the same as in the original file
  // (I'm only showing the fix for the specific error)
  
  async getRevenueTrend(startDate?: string, endDate?: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    if (!['day', 'week', 'month'].includes(groupBy)) {
      throw new AppError(400, 'Invalid groupBy parameter. Must be: day, week, or month');
    }

    const where: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
    };

    if (start || end) {
      where.purchaseDate = {};
      if (start) where.purchaseDate.gte = start;
      if (end) where.purchaseDate.lte = end;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        purchaseDate: true,
        amount: true,
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });

    const grouped = orders.reduce((acc: any, order) => {
      let dateKey: string;
      const date = new Date(order.purchaseDate);

      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      }

      acc[dateKey].revenue += Number(order.amount);
      acc[dateKey].count += 1;

      return acc;
    }, {});

    return Object.values(grouped);
  }

  async getScanAnalytics(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const where: Prisma.TicketScanWhereInput = {};
    if (start || end) {
      where.scannedAt = {};
      if (start) where.scannedAt.gte = start;
      if (end) where.scannedAt.lte = end;
    }

    const [scans, allowedScans, deniedScans, scansBySession] = await Promise.all([
      prisma.ticketScan.count({ where }),
      prisma.ticketScan.count({ where: { ...where, allowed: true } }),
      prisma.ticketScan.count({ where: { ...where, allowed: false } }),
      prisma.ticketScan.groupBy({
        by: ['location'],
        where,
        _count: true,
        orderBy: { _count: { location: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalScans: scans,
      allowedScans,
      deniedScans,
      successRate: scans > 0 ? ((allowedScans / scans) * 100).toFixed(2) : '0.00',
      scansByLocation: scansBySession,
    };
  }

  async getCustomerAnalytics(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const where: Prisma.CustomerWhereInput = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }

    const [
      totalCustomers,
      activeCustomers,
      newCustomers,
      customersByLocation,
      topCustomers,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'active' } }),
      prisma.customer.count({ where }),
      prisma.customer.groupBy({
        by: ['location'],
        _count: true,
        orderBy: { _count: { location: 'desc' } },
        take: 10,
      }),
      prisma.customer.findMany({
        where: { totalOrders: { gt: 0 } },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          totalOrders: true,
          totalSpent: true,
        },
      }),
    ]);

    return {
      total: totalCustomers,
      active: activeCustomers,
      new: newCustomers,
      byLocation: customersByLocation,
      topSpenders: topCustomers,
    };
  }

  async getOrderAnalytics(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const where: Prisma.OrderWhereInput = {};
    if (start || end) {
      where.purchaseDate = {};
      if (start) where.purchaseDate.gte = start;
      if (end) where.purchaseDate.lte = end;
    }

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      avgOrderValue,
      ordersByStatus,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { amount: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    return {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      averageValue: avgOrderValue._avg.amount || 0,
      byStatus: ordersByStatus,
    };
  }

  async getTicketAnalytics(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const where: Prisma.TicketWhereInput = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }

    const [
      totalTickets,
      activeTickets,
      scannedTickets,
      expiredTickets,
      cancelledTickets,
      ticketsBySession,
    ] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.ticket.count({ where: { ...where, status: 'SCANNED' } }),
      prisma.ticket.count({ where: { ...where, status: 'EXPIRED' } }),
      prisma.ticket.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.ticket.groupBy({
        by: ['gameSession'],
        where,
        _count: true,
        orderBy: { _count: { gameSession: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total: totalTickets,
      active: activeTickets,
      scanned: scannedTickets,
      expired: expiredTickets,
      cancelled: cancelledTickets,
      bySession: ticketsBySession,
    };
  }

  async getRevenueMetrics(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const dateFilter: Prisma.OrderWhereInput = { status: 'COMPLETED' };
    if (start || end) {
      dateFilter.purchaseDate = {};
      if (start) dateFilter.purchaseDate.gte = start;
      if (end) dateFilter.purchaseDate.lte = end;
    }

    const [totalRevenue, orderCount, avgOrderValue] = await Promise.all([
      prisma.order.aggregate({
        where: dateFilter,
        _sum: { amount: true },
      }),
      prisma.order.count({ where: dateFilter }),
      prisma.order.aggregate({
        where: dateFilter,
        _avg: { amount: true },
      }),
    ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      orderCount,
      avgOrderValue: Number(avgOrderValue._avg.amount) || 0,
    };
  }

  async getTicketStats(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const dateFilter: Prisma.TicketWhereInput = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = start;
      if (end) dateFilter.createdAt.lte = end;
    }

    const [total, statusBreakdown] = await Promise.all([
      prisma.ticket.count({ where: dateFilter }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: dateFilter,
        _count: true,
      }),
    ]);

    return {
      total,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  async getCustomerStats(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const dateFilter: Prisma.CustomerWhereInput = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = start;
      if (end) dateFilter.createdAt.lte = end;
    }

    const [total, newCustomers, conversionRate] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: dateFilter }),
      this.calculateConversionRate(start, end),
    ]);

    return {
      total,
      newCustomers,
      conversionRate,
    };
  }

  private async calculateConversionRate(start?: Date, end?: Date): Promise<number> {
    const dateFilter: Prisma.CustomerWhereInput = {};
    if (start || end) {
      dateFilter.createdAt = {};
      if (start) dateFilter.createdAt.gte = start;
      if (end) dateFilter.createdAt.lte = end;
    }

    const [visitors, customers] = await Promise.all([
      prisma.customer.count({ where: dateFilter }),
      prisma.customer.count({ 
        where: { 
          ...dateFilter,
          totalOrders: { gt: 0 },
        } 
      }),
    ]);

    return visitors > 0 ? parseFloat(((customers / visitors) * 100).toFixed(2)) : 0;
  }

  async getScanStats(startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    const dateFilter: Prisma.TicketScanWhereInput = {};
    if (start || end) {
      dateFilter.scannedAt = {};
      if (start) dateFilter.scannedAt.gte = start;
      if (end) dateFilter.scannedAt.lte = end;
    }

    const [totalScans, allowedScans, deniedScans] = await Promise.all([
      prisma.ticketScan.count({ where: dateFilter }),
      prisma.ticketScan.count({ where: { ...dateFilter, allowed: true } }),
      prisma.ticketScan.count({ where: { ...dateFilter, allowed: false } }),
    ]);

    const successRate = totalScans > 0 
      ? parseFloat(((allowedScans / totalScans) * 100).toFixed(2)) 
      : 0;

    return {
      totalScans,
      allowedScans,
      deniedScans,
      successRate,
    };
  }

  async getCampaignStats() {
    const [totalCampaigns, sentCampaigns, avgOpenRate, avgClickRate] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'SENT' } }),
      this.calculateAvgOpenRate(),
      this.calculateAvgClickRate(),
    ]);

    return {
      totalCampaigns,
      sentCampaigns,
      avgOpenRate,
      avgClickRate,
    };
  }

  private async calculateAvgOpenRate(): Promise<number> {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'SENT', sentTo: { gt: 0 } },
      select: { sentTo: true, openedCount: true },
    });

    if (campaigns.length === 0) return 0;

    const totalRate = campaigns.reduce((sum, c) => {
      return sum + (c.openedCount / c.sentTo) * 100;
    }, 0);

    return parseFloat((totalRate / campaigns.length).toFixed(2));
  }

  private async calculateAvgClickRate(): Promise<number> {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'SENT', openedCount: { gt: 0 } },
      select: { openedCount: true, clickedCount: true },
    });

    if (campaigns.length === 0) return 0;

    const totalRate = campaigns.reduce((sum, c) => {
      return sum + (c.clickedCount / c.openedCount) * 100;
    }, 0);

    return parseFloat((totalRate / campaigns.length).toFixed(2));
  }

  async exportData(
    type: 'orders' | 'tickets' | 'customers' | 'scans', 
    startDate?: string, 
    endDate?: string
  ): Promise<string> {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    let data: any[];

    switch (type) {
      case 'orders':
        data = await this.exportOrdersData(start, end);
        const orderParser = new Parser({
          fields: ['orderNumber', 'customerEmail', 'amount', 'quantity', 'status', 'purchaseDate'],
        });
        return orderParser.parse(data);

      case 'tickets':
        data = await this.exportTicketsData(start, end);
        const ticketParser = new Parser({
          fields: ['ticketCode', 'orderNumber', 'gameSession', 'status', 'validUntil', 'scanCount'],
        });
        return ticketParser.parse(data);

      case 'customers':
        data = await this.exportCustomersData(start, end);
        const customerParser = new Parser({
          fields: ['firstName', 'lastName', 'email', 'phone', 'totalOrders', 'totalSpent', 'createdAt'],
        });
        return customerParser.parse(data);

      case 'scans':
        data = await this.exportScansData(start, end);
        const scanParser = new Parser({
          fields: ['ticketCode', 'scannedAt', 'scannedBy', 'location', 'allowed', 'reason'],
        });
        return scanParser.parse(data);

      default:
        throw new AppError(400, 'Invalid export type');
    }
  }

  private async exportOrdersData(start?: Date, end?: Date) {
    const where: Prisma.OrderWhereInput = {};
    if (start || end) {
      where.purchaseDate = {};
      if (start) where.purchaseDate.gte = start;
      if (end) where.purchaseDate.lte = end;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { email: true } },
      },
    });

    return orders.map(o => ({
      orderNumber: o.orderNumber,
      customerEmail: o.customer.email,
      amount: Number(o.amount),
      quantity: o.quantity,
      status: o.status,
      purchaseDate: o.purchaseDate.toISOString(),
    }));
  }

  private async exportTicketsData(start?: Date, end?: Date) {
    const where: Prisma.TicketWhereInput = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    return tickets.map(t => ({
      ticketCode: t.ticketCode,
      orderNumber: t.order.orderNumber,
      gameSession: t.gameSession,
      status: t.status,
      validUntil: t.validUntil.toISOString(),
      scanCount: t.scanCount,
    }));
  }

  private async exportCustomersData(start?: Date, end?: Date) {
    const where: Prisma.CustomerWhereInput = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }

    const customers = await prisma.customer.findMany({ where });

    return customers.map(c => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      totalOrders: c.totalOrders,
      totalSpent: Number(c.totalSpent),
      createdAt: c.createdAt.toISOString(),
    }));
  }

  private async exportScansData(start?: Date, end?: Date) {
    const where: Prisma.TicketScanWhereInput = {};
    if (start || end) {
      where.scannedAt = {};
      if (start) where.scannedAt.gte = start;
      if (end) where.scannedAt.lte = end;
    }

    const scans = await prisma.ticketScan.findMany({
      where,
      include: {
        ticket: { select: { ticketCode: true } },
      },
    });

    return scans.map(s => ({
      ticketCode: s.ticket.ticketCode,
      scannedAt: s.scannedAt.toISOString(),
      scannedBy: s.scannedBy,
      location: s.location || 'Unknown',
      allowed: s.allowed,
      reason: s.reason,
    }));
  }
}