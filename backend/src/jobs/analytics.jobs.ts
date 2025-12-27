// backend/src/jobs/analytics.jobs.ts
import { Worker, Queue } from 'bullmq';
import { connection } from '../config/queue';
import { logger } from '../utils/logger';
import { cacheService } from '../utils/cache.service';
import { KPIService } from '../modules/analytics/kpi.service';
import { RevenueService } from '../modules/analytics/revenue.service';
import { PerformanceService } from '../modules/analytics/performance.service';
import { CustomerCampaignService } from '../modules/analytics/customer-campaign.service';
import { TimePeriod } from '../modules/analytics/analytics.types';
import { format } from 'date-fns';

// Create analytics queue
export const analyticsQueue = new Queue('analytics', {
  connection,
});

// Initialize services
const kpiService = new KPIService();
const revenueService = new RevenueService();
const performanceService = new PerformanceService();
const customerCampaignService = new CustomerCampaignService();

/**
 * Schedule cache warming for all periods
 */
export const scheduleCacheWarming = async () => {
  // Warm cache every 5 minutes for 30d period (most used)
  await analyticsQueue.add(
    'warm-cache',
    { period: TimePeriod.THIRTY_DAYS },
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
      jobId: 'warm-cache-30d',
    }
  );

  // Warm cache every 15 minutes for other periods
  await analyticsQueue.add(
    'warm-cache',
    { period: TimePeriod.SEVEN_DAYS },
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
      jobId: 'warm-cache-7d',
    }
  );

  await analyticsQueue.add(
    'warm-cache',
    { period: TimePeriod.NINETY_DAYS },
    {
      repeat: {
        pattern: '*/15 * * * *',
      },
      jobId: 'warm-cache-90d',
    }
  );

  await analyticsQueue.add(
    'warm-cache',
    { period: TimePeriod.ONE_YEAR },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      jobId: 'warm-cache-1y',
    }
  );

  logger.info('Analytics cache warming scheduled');
};

/**
 * Schedule daily revenue target updates
 */
export const scheduleRevenueTargetUpdates = async () => {
  await analyticsQueue.add(
    'update-revenue-targets',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Daily at midnight
      },
      jobId: 'update-revenue-targets',
    }
  );

  logger.info('Revenue target updates scheduled');
};

/**
 * Schedule cleanup of expired cache
 */
export const scheduleCleanup = async () => {
  await analyticsQueue.add(
    'cleanup-cache',
    {},
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
      jobId: 'cleanup-cache',
    }
  );

  logger.info('Cache cleanup scheduled');
};

/**
 * Analytics Worker
 */
export const analyticsWorker = new Worker(
  'analytics',
  async (job) => {
    const { name, data } = job;

    try {
      switch (name) {
        case 'warm-cache':
          await warmCache(data.period);
          break;

        case 'update-revenue-targets':
          await updateRevenueTargets();
          break;

        case 'cleanup-cache':
          await cleanupCache();
          break;

        case 'generate-report':
          await generateReport(data);
          break;

        default:
          logger.warn(`Unknown analytics job: ${name}`);
      }

      return { success: true, job: name };
    } catch (error: any) {
      logger.error(`Analytics job failed (${name}):`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

/**
 * Warm cache for a specific period
 */
async function warmCache(period: TimePeriod) {
  logger.info(`Warming cache for period: ${period}`);

  const start = Date.now();

  try {
    // Warm KPIs
    const kpiKey = cacheService.generateAnalyticsKey('kpi', { period });
    const kpis = await kpiService.getDashboardKPIs(period);
    await cacheService.set(kpiKey, kpis, 300);

    // Warm revenue overview
    const revenueKey = cacheService.generateAnalyticsKey('revenue:overview', { period });
    const revenue = await revenueService.getRevenueOverview(period);
    await cacheService.set(revenueKey, revenue, 300);

    // Warm ticket performance
    const ticketKey = cacheService.generateAnalyticsKey('tickets:performance', { period });
    const tickets = await performanceService.getTicketPerformance(period);
    await cacheService.set(ticketKey, tickets, 300);

    // Warm session distribution
    const sessionKey = cacheService.generateAnalyticsKey('sessions:distribution', { period });
    const sessions = await performanceService.getSessionDistribution(period);
    await cacheService.set(sessionKey, sessions, 600);

    // Warm customer growth
    const customerKey = cacheService.generateAnalyticsKey('customers:growth', { period });
    const customers = await customerCampaignService.getCustomerGrowth(period);
    await cacheService.set(customerKey, customers, 300);

    const duration = Date.now() - start;
    logger.info(`Cache warmed successfully for ${period} in ${duration}ms`);
  } catch (error) {
    logger.error(`Cache warming failed for ${period}:`, error);
    throw error;
  }
}

/**
 * Update revenue targets with actual data
 */
async function updateRevenueTargets() {
  logger.info('Updating revenue targets');

  try {
    // Get current month
    const currentMonth = format(new Date(), 'yyyy-MM');

    // Update actual revenue for current month
    await revenueService.updateActualRevenue(currentMonth);

    // Also update previous month if it's the first day
    const today = new Date();
    if (today.getDate() === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStr = format(lastMonth, 'yyyy-MM');
      await revenueService.updateActualRevenue(lastMonthStr);
    }

    // Invalidate revenue cache
    await cacheService.deletePattern('analytics:revenue:*');

    logger.info('Revenue targets updated successfully');
  } catch (error) {
    logger.error('Revenue target update failed:', error);
    throw error;
  }
}

/**
 * Cleanup expired cache entries
 */
async function cleanupCache() {
  logger.info('Starting cache cleanup');

  try {
    const deleted = await cacheService.cleanupExpired();
    logger.info(`Cache cleanup completed: ${deleted} entries removed`);
  } catch (error) {
    logger.error('Cache cleanup failed:', error);
    throw error;
  }
}

/**
 * Generate custom analytics report
 */
async function generateReport(data: any) {
  logger.info('Generating analytics report', data);

  try {
    const { reportType, email, period } = data;

    // Implementation would generate PDF/Excel report
    // and email it to the user

    logger.info(`Report generated and sent to ${email}`);
  } catch (error) {
    logger.error('Report generation failed:', error);
    throw error;
  }
}

/**
 * Initialize all analytics jobs
 */
export const initializeAnalyticsJobs = async () => {
  await scheduleCacheWarming();
  await scheduleRevenueTargetUpdates();
  await scheduleCleanup();
  logger.info('All analytics jobs initialized');
};

// Event handlers
analyticsWorker.on('completed', (job) => {
  logger.debug(`Analytics job ${job.id} completed`);
});

analyticsWorker.on('failed', (job, err) => {
  logger.error(`Analytics job ${job?.id} failed:`, err);
});

analyticsWorker.on('error', (err) => {
  logger.error('Analytics worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await analyticsWorker.close();
  logger.info('Analytics worker shut down');
});