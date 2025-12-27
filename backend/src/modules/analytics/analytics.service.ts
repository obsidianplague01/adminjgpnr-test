// src/modules/analytics/analytics.service.ts
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

/**
 * Validate and parse date input
 */
const validateDate = (dateString: string | undefined, fieldName: string): Date | undefined => {
  if (!dateString) return undefined;
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName} format`);
  }
  
  // Ensure date is not in the future
  if (date > new Date()) {
    throw new AppError(400, `${fieldName} cannot be in the future`);
  }
  
  // Ensure date is not too far in the past (e.g., 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  
  if (date < tenYearsAgo) {
    throw new AppError(400, `${fieldName} cannot be more than 10 years in the past`);
  }
  
  return date;
};

/**
 * Validate date range
 */
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
  /**
   * Get dashboard overview
   */
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
      prisma.ticket.count({ where: dateFilter.purchaseDate ? { createdAt: dateFilter.purchaseDate } : {} }),
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

  /**
   * Get revenue trend over time
   */
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

    // Group by date
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

  /**
   * Get ticket scan analytics
   */
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

  /**
   * Get customer analytics
   */
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

  /**
   * Get order analytics
   */
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

  /**
   * Get ticket analytics
   */
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

  /**
   * Export analytics data
   */
  async exportData(type: 'orders' | 'tickets' | 'customers' | 'scans', startDate?: string, endDate?: string) {
    const start = validateDate(startDate, 'startDate');
    const end = validateDate(endDate, 'endDate');
    
    validateDateRange(start, end);

    if (!['orders', 'tickets', 'customers', 'scans'].includes(type)) {
      throw new AppError(400, 'Invalid export type. Must be: orders, tickets, customers, or scans');
    }

    const where: any = {};
    const dateField = type === 'scans' ? 'scannedAt' : type === 'orders' ? 'purchaseDate' : 'createdAt';

    if (start || end) {
      where[dateField] = {};
      if (start) where[dateField].gte = start;
      if (end) where[dateField].lte = end;
    }

    let data: any[];

    switch (type) {
      case 'orders':
        data = await prisma.order.findMany({
          where,
          include: {
            customer: {
              select: { firstName: true, lastName: true, email: true },
            },
            tickets: {
              select: { ticketCode: true, status: true },
            },
          },
        });
        break;

      case 'tickets':
        data = await prisma.ticket.findMany({
          where,
          include: {
            order: {
              include: {
                customer: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        });
        break;

      case 'customers':
        data = await prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: { orders: true },
            },
          },
        });
        break;

      case 'scans':
        data = await prisma.ticketScan.findMany({
          where,
          include: {
            ticket: {
              select: { ticketCode: true, gameSession: true },
            },
          },
        });
        break;

      default:
        throw new AppError(400, 'Invalid export type');
    }

    logger.info(`Exported ${data.length} ${type} records`);
    return data;
  }
}