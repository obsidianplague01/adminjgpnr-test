import prisma from '../config/database';
import { logger } from './logger';

export class MaterializedViewService {
  /**
   * Refresh all materialized views
   */
  async refreshAllViews(): Promise<void> {
    const start = Date.now();
    
    try {
      await prisma.$executeRaw`SELECT refresh_analytics_views()`;
      
      const duration = Date.now() - start;
      logger.info(`Materialized views refreshed in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to refresh materialized views:', error);
      throw error;
    }
  }

  /**
   * Get daily revenue from materialized view
   */
  async getDailyRevenue(startDate: Date, endDate: Date) {
    const data = await prisma.$queryRaw<Array<{
      date: Date;
      revenue: number;
      order_count: number;
      unique_customers: number;
      avg_order_value: number;
      tickets_sold: number;
    }>>`
      SELECT 
        date,
        revenue::numeric as revenue,
        order_count,
        unique_customers,
        avg_order_value::numeric as avg_order_value,
        tickets_sold
      FROM analytics_daily_revenue
      WHERE date BETWEEN ${startDate} AND ${endDate}
      ORDER BY date DESC
    `;

    return data.map(row => ({
      date: row.date,
      revenue: Number(row.revenue),
      orderCount: row.order_count,
      uniqueCustomers: row.unique_customers,
      avgOrderValue: Number(row.avg_order_value),
      ticketsSold: row.tickets_sold
    }));
  }

  /**
   * Get monthly revenue from materialized view
   */
  async getMonthlyRevenue(months?: number) {
    const limit = months || 12;
    
    const data = await prisma.$queryRaw<Array<{
      month: string;
      revenue: number;
      order_count: number;
      unique_customers: number;
      avg_order_value: number;
      tickets_sold: number;
    }>>`
      SELECT 
        month,
        revenue::numeric as revenue,
        order_count,
        unique_customers,
        avg_order_value::numeric as avg_order_value,
        tickets_sold
      FROM analytics_monthly_revenue
      ORDER BY month DESC
      LIMIT ${limit}
    `;

    return data.map(row => ({
      month: row.month,
      revenue: Number(row.revenue),
      orderCount: row.order_count,
      uniqueCustomers: row.unique_customers,
      avgOrderValue: Number(row.avg_order_value),
      ticketsSold: row.tickets_sold
    }));
  }

  /**
   * Get session performance from materialized view
   */
  async getSessionPerformance() {
    const data = await prisma.$queryRaw<Array<{
      game_session: string;
      total_tickets: number;
      scanned_tickets: number;
      scan_rate: number;
      avg_revenue_per_ticket: number;
      total_revenue: number;
      first_ticket_date: Date;
      last_ticket_date: Date;
    }>>`
      SELECT 
        game_session,
        total_tickets,
        scanned_tickets,
        scan_rate::numeric as scan_rate,
        avg_revenue_per_ticket::numeric as avg_revenue_per_ticket,
        total_revenue::numeric as total_revenue,
        first_ticket_date,
        last_ticket_date
      FROM analytics_session_performance
      ORDER BY total_revenue DESC
    `;

    return data.map(row => ({
      gameSession: row.game_session,
      totalTickets: row.total_tickets,
      scannedTickets: row.scanned_tickets,
      scanRate: Number(row.scan_rate),
      avgRevenuePerTicket: Number(row.avg_revenue_per_ticket),
      totalRevenue: Number(row.total_revenue),
      firstTicketDate: row.first_ticket_date,
      lastTicketDate: row.last_ticket_date
    }));
  }

  /**
   * Get customer segments from materialized view
   */
  async getCustomerSegments() {
    const data = await prisma.$queryRaw<Array<{
      segment: string;
      count: number;
      total_revenue: number;
      avg_spent: number;
    }>>`
      SELECT 
        segment,
        COUNT(*) as count,
        SUM(total_spent)::numeric as total_revenue,
        AVG(total_spent)::numeric as avg_spent
      FROM analytics_customer_segments
      GROUP BY segment
      ORDER BY total_revenue DESC
    `;

    return data.map(row => ({
      segment: row.segment,
      count: Number(row.count),
      totalRevenue: Number(row.total_revenue),
      avgSpent: Number(row.avg_spent)
    }));
  }

  /**
   * Get scan statistics from materialized view
   */
  async getScanStats(startDate: Date, endDate: Date) {
    const data = await prisma.$queryRaw<Array<{
      date: Date;
      total_scans: number;
      allowed_scans: number;
      denied_scans: number;
      success_rate: number;
      location: string | null;
    }>>`
      SELECT 
        date,
        total_scans,
        allowed_scans,
        denied_scans,
        success_rate::numeric as success_rate,
        location
      FROM analytics_scan_stats
      WHERE date BETWEEN ${startDate} AND ${endDate}
      ORDER BY date DESC, location
    `;

    return data.map(row => ({
      date: row.date,
      totalScans: row.total_scans,
      allowedScans: row.allowed_scans,
      deniedScans: row.denied_scans,
      successRate: Number(row.success_rate),
      location: row.location || 'Unknown'
    }));
  }
}

export const viewService = new MaterializedViewService();