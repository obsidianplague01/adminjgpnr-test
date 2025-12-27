// backend/src/modules/analytics/analytics.types.ts
export enum TimePeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y'
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface KPIMetric {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RevenueKPI extends KPIMetric {
  target?: number;
  targetPercent?: number;
}

export interface DashboardKPIs {
  revenue: RevenueKPI;
  ticketSales: KPIMetric;
  customers: KPIMetric;
  scanRate: KPIMetric & { scannedCount: number; totalCount: number };
}

export interface MonthlyDataPoint {
  month: string; // YYYY-MM
  value: number;
  target?: number;
}

export interface RevenueOverview {
  monthly: MonthlyDataPoint[];
  total: number;
  average: number;
  peak: MonthlyDataPoint;
}

export interface TicketPerformance {
  monthly: Array<{
    month: string;
    active: number;
    scanned: number;
    cancelled: number;
    expired: number;
  }>;
  summary: {
    totalActive: number;
    totalScanned: number;
    scanRate: number;
  };
}

export interface SessionDistribution {
  sessions: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export interface CustomerGrowth {
  timeline: Array<{
    period: string;
    new: number;
    total: number;
    growthRate: number;
  }>;
  summary: {
    totalGrowth: number;
    averageGrowthRate: number;
  };
}

export interface CampaignPerformance {
  openRate: number;
  clickThroughRate: number;
  conversionRate: number;
  trends: Array<{
    campaign: string;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  }>;
}

export interface MarketingMetric {
  name: string;
  value: string | number;
  change: number;
  status: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export interface ComparisonResult<T> {
  current: T;
  previous: T;
  change: number;
  changePercent: number;
}

export interface AnalyticsQuery {
  period?: TimePeriod;
  startDate?: string;
  endDate?: string;
  compareWith?: TimePeriod;
  groupBy?: 'day' | 'week' | 'month';
}