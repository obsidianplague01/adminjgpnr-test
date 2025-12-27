// backend/src/modules/analytics/customer-campaign.service.ts
import prisma from '../../config/database';
import { 
  CustomerGrowth, 
  CampaignPerformance,
  MarketingMetric,
  DateRange,
  TimePeriod 
} from './analytics.types';
import { format, eachMonthOfInterval, differenceInDays } from 'date-fns';

export class CustomerCampaignService {
  /**
   * Get customer growth analytics
   */
  async getCustomerGrowth(period: TimePeriod): Promise<CustomerGrowth> {
    const range = this.getDateRange(period);
    
    const customers = await prisma.customer.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Generate time periods
    const months = eachMonthOfInterval({ start: range.start, end: range.end });
    
    // Group by period
    const timeline = months.map(monthDate => {
      const month = format(monthDate, 'yyyy-MM');
      
      const newInMonth = customers.filter(c => 
        format(c.createdAt, 'yyyy-MM') === month
      ).length;

      // Calculate cumulative total up to this month
      const totalUpToMonth = customers.filter(c => 
        c.createdAt <= new Date(month + '-31')
      ).length;

      // Calculate growth rate
      const prevMonthTotal = totalUpToMonth - newInMonth;
      const growthRate = prevMonthTotal > 0 
        ? ((newInMonth / prevMonthTotal) * 100) 
        : 0;

      return {
        period: month,
        new: newInMonth,
        total: totalUpToMonth,
        growthRate: parseFloat(growthRate.toFixed(2)),
      };
    });

    // Calculate overall summary
    const totalGrowth = customers.length;
    const avgGrowthRate = timeline.length > 0
      ? timeline.reduce((sum, t) => sum + t.growthRate, 0) / timeline.length
      : 0;

    return {
      timeline,
      summary: {
        totalGrowth,
        averageGrowthRate: parseFloat(avgGrowthRate.toFixed(2)),
      },
    };
  }

  /**
   * Get customer retention metrics
   */
  async getCustomerRetention(range: DateRange) {
    const customers = await prisma.customer.findMany({
      where: {
        createdAt: { lt: range.start },
      },
      include: {
        orders: {
          where: {
            purchaseDate: { gte: range.start, lte: range.end },
          },
        },
      },
    });

    const returningCustomers = customers.filter(c => c.orders.length > 0).length;
    const retentionRate = customers.length > 0 
      ? (returningCustomers / customers.length) * 100 
      : 0;

    // Calculate average order frequency
    const totalOrders = customers.reduce((sum, c) => sum + c.orders.length, 0);
    const avgOrderFrequency = returningCustomers > 0 
      ? totalOrders / returningCustomers 
      : 0;

    return {
      totalCustomers: customers.length,
      returningCustomers,
      retentionRate: parseFloat(retentionRate.toFixed(2)),
      avgOrderFrequency: parseFloat(avgOrderFrequency.toFixed(2)),
    };
  }

  /**
   * Get customer segments
   */
  async getCustomerSegments(range: DateRange) {
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

    // RFM Segmentation (Recency, Frequency, Monetary)
    const segments = {
      champions: { count: 0, revenue: 0 },
      loyalCustomers: { count: 0, revenue: 0 },
      potentialLoyalists: { count: 0, revenue: 0 },
      atRisk: { count: 0, revenue: 0 },
      needsAttention: { count: 0, revenue: 0 },
    };

    for (const customer of customers) {
      const totalSpent = customer.orders.reduce((sum, o) => sum + Number(o.amount), 0);
      const orderCount = customer.orders.length;
      const daysSinceLastPurchase = customer.lastPurchase 
        ? differenceInDays(new Date(), customer.lastPurchase)
        : 999;

      // Segmentation logic
      if (orderCount >= 5 && totalSpent > 50000 && daysSinceLastPurchase < 30) {
        segments.champions.count++;
        segments.champions.revenue += totalSpent;
      } else if (orderCount >= 3 && totalSpent > 25000) {
        segments.loyalCustomers.count++;
        segments.loyalCustomers.revenue += totalSpent;
      } else if (orderCount >= 2 && daysSinceLastPurchase < 60) {
        segments.potentialLoyalists.count++;
        segments.potentialLoyalists.revenue += totalSpent;
      } else if (orderCount >= 3 && daysSinceLastPurchase > 90) {
        segments.atRisk.count++;
        segments.atRisk.revenue += totalSpent;
      } else {
        segments.needsAttention.count++;
        segments.needsAttention.revenue += totalSpent;
      }
    }

    return segments;
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(): Promise<CampaignPerformance> {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'SENT' },
      include: {
        tracking: true,
      },
      orderBy: { sentAt: 'desc' },
      take: 10,
    });

    if (campaigns.length === 0) {
      return {
        openRate: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        trends: [],
      };
    }

    // Calculate overall metrics
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalConverted = 0;

    const trends = campaigns.map(campaign => {
      const sent = campaign.sentTo;
      const opened = campaign.tracking.filter(t => t.opened).length;
      const clicked = campaign.tracking.filter(t => t.clicked).length;
      const converted = campaign.tracking.filter(t => t.converted).length;

      totalSent += sent;
      totalOpened += opened;
      totalClicked += clicked;
      totalConverted += converted;

      return {
        campaign: campaign.subject,
        sent,
        opened,
        clicked,
        converted,
      };
    });

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickThroughRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const conversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    return {
      openRate: parseFloat(openRate.toFixed(2)),
      clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      trends,
    };
  }

  /**
   * Get campaign funnel analytics
   */
  async getCampaignFunnel(range: DateRange) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'SENT',
        sentAt: { gte: range.start, lte: range.end },
      },
      include: {
        tracking: true,
      },
    });

    const funnel = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
    };

    for (const campaign of campaigns) {
      funnel.sent += campaign.sentTo;
      funnel.delivered += campaign.tracking.length;
      funnel.opened += campaign.tracking.filter(t => t.opened).length;
      funnel.clicked += campaign.tracking.filter(t => t.clicked).length;
      funnel.converted += campaign.tracking.filter(t => t.converted).length;
    }

    // Calculate conversion rates at each stage
    return {
      stages: [
        { name: 'Sent', count: funnel.sent, rate: 100 },
        { 
          name: 'Delivered', 
          count: funnel.delivered, 
          rate: funnel.sent > 0 ? (funnel.delivered / funnel.sent) * 100 : 0,
        },
        { 
          name: 'Opened', 
          count: funnel.opened, 
          rate: funnel.delivered > 0 ? (funnel.opened / funnel.delivered) * 100 : 0,
        },
        { 
          name: 'Clicked', 
          count: funnel.clicked, 
          rate: funnel.opened > 0 ? (funnel.clicked / funnel.opened) * 100 : 0,
        },
        { 
          name: 'Converted', 
          count: funnel.converted, 
          rate: funnel.sent > 0 ? (funnel.converted / funnel.sent) * 100 : 0,
        },
      ],
    };
  }

  /**
   * Get marketing metrics table
   */
  async getMarketingMetrics(range: DateRange): Promise<MarketingMetric[]> {
    const [
      emailStats,
      customerStats,
      revenueStats,
      campaignStats,
    ] = await Promise.all([
      this.getEmailStats(range),
      this.getCustomerMetrics(range),
      this.getRevenueMetrics(range),
      this.getCampaignStats(range),
    ]);

    return [
      {
        name: 'Email Open Rate',
        value: `${emailStats.openRate}%`,
        change: emailStats.openRateChange,
        status: this.getMetricStatus(emailStats.openRateChange),
        icon: '📧',
      },
      {
        name: 'Click-Through Rate',
        value: `${emailStats.ctr}%`,
        change: emailStats.ctrChange,
        status: this.getMetricStatus(emailStats.ctrChange),
        icon: '🖱️',
      },
      {
        name: 'Conversion Rate',
        value: `${campaignStats.conversionRate}%`,
        change: campaignStats.conversionChange,
        status: this.getMetricStatus(campaignStats.conversionChange),
        icon: '🎯',
      },
      {
        name: 'Customer Acquisition Cost',
        value: `₦${revenueStats.cac.toLocaleString()}`,
        change: revenueStats.cacChange,
        status: this.getMetricStatus(-revenueStats.cacChange), // Lower CAC is better
        icon: '💰',
      },
      {
        name: 'Customer Lifetime Value',
        value: `₦${customerStats.ltv.toLocaleString()}`,
        change: customerStats.ltvChange,
        status: this.getMetricStatus(customerStats.ltvChange),
        icon: '👥',
      },
      {
        name: 'ROI',
        value: `${revenueStats.roi}%`,
        change: revenueStats.roiChange,
        status: this.getMetricStatus(revenueStats.roiChange),
        icon: '📈',
      },
    ];
  }

  // ===== PRIVATE HELPER METHODS =====

  private async getEmailStats(range: DateRange) {
    // Current period
    const current = await this.calculateEmailStats(range);
    
    // Previous period
    const prevRange = this.getPreviousPeriod(range);
    const previous = await this.calculateEmailStats(prevRange);

    return {
      openRate: current.openRate,
      openRateChange: current.openRate - previous.openRate,
      ctr: current.ctr,
      ctrChange: current.ctr - previous.ctr,
    };
  }

  private async calculateEmailStats(range: DateRange) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'SENT',
        sentAt: { gte: range.start, lte: range.end },
      },
      include: { tracking: true },
    });

    const totalSent = campaigns.reduce((sum, c) => sum + c.sentTo, 0);
    const totalOpened = campaigns.reduce(
      (sum, c) => sum + c.tracking.filter(t => t.opened).length,
      0
    );
    const totalClicked = campaigns.reduce(
      (sum, c) => sum + c.tracking.filter(t => t.clicked).length,
      0
    );

    return {
      openRate: totalSent > 0 ? parseFloat(((totalOpened / totalSent) * 100).toFixed(2)) : 0,
      ctr: totalOpened > 0 ? parseFloat(((totalClicked / totalOpened) * 100).toFixed(2)) : 0,
    };
  }

  private async getCustomerMetrics(range: DateRange) {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    const totalRevenue = customers.reduce(
      (sum, c) => sum + Number(c.totalSpent),
      0
    );
    
    const ltv = customers.length > 0 ? totalRevenue / customers.length : 0;

    // Get previous period LTV for comparison
    const prevRange = this.getPreviousPeriod(range);
    const prevLtv = await this.calculateLTV(prevRange);

    return {
      ltv: parseFloat(ltv.toFixed(2)),
      ltvChange: parseFloat((ltv - prevLtv).toFixed(2)),
    };
  }

  private async calculateLTV(range: DateRange): Promise<number> {
    const revenue = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    const customerCount = await prisma.customer.count({
      where: {
        orders: {
          some: {
            status: 'COMPLETED',
            purchaseDate: { gte: range.start, lte: range.end },
          },
        },
      },
    });

    return customerCount > 0 
      ? Number(revenue._sum.amount || 0) / customerCount 
      : 0;
  }

  private async getRevenueMetrics(range: DateRange) {
    // Simplified CAC and ROI calculations
    const marketingCost = 50000; // Placeholder - should come from marketing budget table
    
    const newCustomers = await prisma.customer.count({
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
    });

    const revenue = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    const totalRevenue = Number(revenue._sum.amount) || 0;
    const cac = newCustomers > 0 ? marketingCost / newCustomers : 0;
    const roi = marketingCost > 0 ? ((totalRevenue - marketingCost) / marketingCost) * 100 : 0;

    // Get previous period for comparison
    const prevRange = this.getPreviousPeriod(range);
    const prevMetrics = await this.calculateRevenueMetrics(prevRange, marketingCost);

    return {
      cac: parseFloat(cac.toFixed(2)),
      cacChange: parseFloat((cac - prevMetrics.cac).toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      roiChange: parseFloat((roi - prevMetrics.roi).toFixed(2)),
    };
  }

  private async calculateRevenueMetrics(range: DateRange, marketingCost: number) {
    const newCustomers = await prisma.customer.count({
      where: { createdAt: { gte: range.start, lte: range.end } },
    });

    const revenue = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        purchaseDate: { gte: range.start, lte: range.end },
      },
      _sum: { amount: true },
    });

    const totalRevenue = Number(revenue._sum.amount) || 0;
    const cac = newCustomers > 0 ? marketingCost / newCustomers : 0;
    const roi = marketingCost > 0 ? ((totalRevenue - marketingCost) / marketingCost) * 100 : 0;

    return { cac, roi };
  }

  private async getCampaignStats(range: DateRange) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'SENT',
        sentAt: { gte: range.start, lte: range.end },
      },
      include: { tracking: true },
    });

    const totalSent = campaigns.reduce((sum, c) => sum + c.sentTo, 0);
    const totalConverted = campaigns.reduce(
      (sum, c) => sum + c.tracking.filter(t => t.converted).length,
      0
    );

    const conversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    // Previous period
    const prevRange = this.getPreviousPeriod(range);
    const prevRate = await this.calculateConversionRate(prevRange);

    return {
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      conversionChange: parseFloat((conversionRate - prevRate).toFixed(2)),
    };
  }

  private async calculateConversionRate(range: DateRange): Promise<number> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'SENT',
        sentAt: { gte: range.start, lte: range.end },
      },
      include: { tracking: true },
    });

    const totalSent = campaigns.reduce((sum, c) => sum + c.sentTo, 0);
    const totalConverted = campaigns.reduce(
      (sum, c) => sum + c.tracking.filter(t => t.converted).length,
      0
    );

    return totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;
  }

  private getPreviousPeriod(range: DateRange): DateRange {
    const duration = range.end.getTime() - range.start.getTime();
    return {
      start: new Date(range.start.getTime() - duration),
      end: new Date(range.start.getTime()),
    };
  }

  private getMetricStatus(change: number): 'success' | 'warning' | 'danger' | 'info' {
    if (change > 5) return 'success';
    if (change > 0) return 'info';
    if (change > -5) return 'warning';
    return 'danger';
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