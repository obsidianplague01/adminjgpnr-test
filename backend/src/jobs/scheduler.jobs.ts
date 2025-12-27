// src/jobs/scheduler.jobs.ts
import { Worker, Queue } from 'bullmq';
import { connection } from '../config/queue';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { sendEmail } from '../config/email';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

const analyticsService = new AnalyticsService();

// Scheduled reports queue
export const scheduledReportsQueue = new Queue('scheduled-reports', {
  connection,
});

/**
 * Schedule daily revenue report
 */
export const scheduleDailyRevenueReport = async () => {
  await scheduledReportsQueue.add(
    'daily-revenue',
    {},
    {
      repeat: {
        pattern: '0 8 * * *', // Every day at 8 AM
      },
    }
  );
  logger.info('Daily revenue report scheduled');
};

/**
 * Schedule weekly summary report
 */
export const scheduleWeeklySummaryReport = async () => {
  await scheduledReportsQueue.add(
    'weekly-summary',
    {},
    {
      repeat: {
        pattern: '0 9 * * 1', // Every Monday at 9 AM
      },
    }
  );
  logger.info('Weekly summary report scheduled');
};

/**
 * Schedule monthly detailed report
 */
export const scheduleMonthlyReport = async () => {
  await scheduledReportsQueue.add(
    'monthly-report',
    {},
    {
      repeat: {
        pattern: '0 7 1 * *', // 1st of every month at 7 AM
      },
    }
  );
  logger.info('Monthly report scheduled');
};

/**
 * Report worker
 */
export const reportWorker = new Worker(
  'scheduled-reports',
  async (job) => {
    const { name } = job;

    try {
      switch (name) {
        case 'daily-revenue':
          await generateDailyRevenueReport();
          break;

        case 'weekly-summary':
          await generateWeeklySummaryReport();
          break;

        case 'monthly-report':
          await generateMonthlyReport();
          break;

        default:
          logger.warn(`Unknown report type: ${name}`);
      }

      return { success: true, report: name };
    } catch (error: any) {
      logger.error(`Report generation failed (${name}):`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

/**
 * Generate daily revenue report
 */
async function generateDailyRevenueReport() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = yesterday.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  // Get metrics
  const revenue = await analyticsService.getRevenueMetrics(startDate, endDate);
  const tickets = await analyticsService.getTicketStats(startDate, endDate);
  const scans = await analyticsService.getScanStats(startDate, endDate);

  // Generate HTML report
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background: #4CAF50; color: white; padding: 20px; }
          .metric { padding: 15px; margin: 10px 0; border: 1px solid #ddd; }
          .metric h3 { margin: 0 0 10px 0; color: #333; }
          .metric .value { font-size: 24px; font-weight: bold; color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Revenue Report</h1>
          <p>${yesterday.toLocaleDateString()}</p>
        </div>

        <div class="metric">
          <h3>💰 Revenue</h3>
          <div class="value">₦${revenue.totalRevenue.toLocaleString()}</div>
          <p>${revenue.orderCount} orders completed</p>
        </div>

        <div class="metric">
          <h3>🎫 Tickets</h3>
          <div class="value">${tickets.total} tickets</div>
          <p>${tickets.statusBreakdown.active || 0} active, ${tickets.statusBreakdown.scanned || 0} scanned</p>
        </div>

        <div class="metric">
          <h3>📊 Scans</h3>
          <div class="value">${scans.totalScans} scans</div>
          <p>${scans.allowedScans} allowed, ${scans.deniedScans} denied</p>
        </div>

        <p style="color: #666; margin-top: 30px;">
          Generated at ${new Date().toLocaleString()}
        </p>
      </body>
    </html>
  `;

  // Get admin emails
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      isActive: true,
    },
    select: { email: true },
  });

  // Send to all admins
  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: `Daily Revenue Report - ${yesterday.toLocaleDateString()}`,
      html,
    });
  }

  logger.info(`Daily revenue report sent to ${admins.length} admins`);
}

/**
 * Generate weekly summary report
 */
async function generateWeeklySummaryReport() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const startDate = lastWeek.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  // Get all metrics
  const revenue = await analyticsService.getRevenueMetrics(startDate, endDate);
  const tickets = await analyticsService.getTicketStats(startDate, endDate);
  const customers = await analyticsService.getCustomerStats(startDate, endDate);
  const scans = await analyticsService.getScanStats(startDate, endDate);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .section { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .metric-box { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric-box h4 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
          .metric-box .value { font-size: 28px; font-weight: bold; color: #667eea; }
          .top-customers { background: white; padding: 15px; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 Weekly Summary Report</h1>
          <p>${lastWeek.toLocaleDateString()} - ${today.toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>💰 Revenue Overview</h2>
          <div class="metrics">
            <div class="metric-box">
              <h4>Total Revenue</h4>
              <div class="value">₦${revenue.totalRevenue.toLocaleString()}</div>
            </div>
            <div class="metric-box">
              <h4>Orders</h4>
              <div class="value">${revenue.orderCount}</div>
            </div>
            <div class="metric-box">
              <h4>Avg Order Value</h4>
              <div class="value">₦${Math.round(revenue.avgOrderValue).toLocaleString()}</div>
            </div>
            <div class="metric-box">
              <h4>Tickets Sold</h4>
              <div class="value">${tickets.total}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>👥 Customer Insights</h2>
          <div class="metrics">
            <div class="metric-box">
              <h4>New Customers</h4>
              <div class="value">${customers.total}</div>
            </div>
            <div class="metric-box">
              <h4>Conversion Rate</h4>
              <div class="value">${customers.conversionRate}%</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🎫 Ticket & Scan Stats</h2>
          <div class="metrics">
            <div class="metric-box">
              <h4>Total Scans</h4>
              <div class="value">${scans.totalScans}</div>
            </div>
            <div class="metric-box">
              <h4>Success Rate</h4>
              <div class="value">${scans.successRate}%</div>
            </div>
          </div>
        </div>

        <p style="color: #666; text-align: center; margin-top: 30px;">
          Generated at ${new Date().toLocaleString()}<br>
          JGPNR Paintball Admin System
        </p>
      </body>
    </html>
  `;

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
    select: { email: true },
  });

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: `Weekly Summary Report - Week of ${lastWeek.toLocaleDateString()}`,
      html,
    });
  }

  logger.info(`Weekly summary report sent to ${admins.length} admins`);
}

/**
 * Generate monthly detailed report with CSV attachments
 */
async function generateMonthlyReport() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const startDate = lastMonth.toISOString().split('T')[0];
  const endDate = lastMonthEnd.toISOString().split('T')[0];

  // Generate CSV exports
  const ordersCSV = await analyticsService.exportData('orders', startDate, endDate);
  const ticketsCSV = await analyticsService.exportData('tickets', startDate, endDate);

  // Save to temp files
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });

  const ordersPath = path.join(tempDir, `orders_${lastMonth.getMonth() + 1}.csv`);
  const ticketsPath = path.join(tempDir, `tickets_${lastMonth.getMonth() + 1}.csv`);

  await fs.writeFile(ordersPath, ordersCSV);
  await fs.writeFile(ticketsPath, ticketsCSV);

  // Get metrics
  const revenue = await analyticsService.getRevenueMetrics(startDate, endDate);

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h1>Monthly Report - ${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h1>
        <h2>Summary</h2>
        <ul>
          <li><strong>Total Revenue:</strong> ₦${revenue.totalRevenue.toLocaleString()}</li>
          <li><strong>Total Orders:</strong> ${revenue.orderCount}</li>
          <li><strong>Avg Order Value:</strong> ₦${Math.round(revenue.avgOrderValue).toLocaleString()}</li>
        </ul>
        <p>Detailed data is attached as CSV files.</p>
      </body>
    </html>
  `;

  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { email: true },
  });

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: `Monthly Report - ${lastMonth.toLocaleString('default', { month: 'long' })}`,
      html,
      attachments: [
        { filename: 'orders.csv', path: ordersPath },
        { filename: 'tickets.csv', path: ticketsPath },
      ],
    });
  }

  // Cleanup temp files
  await fs.unlink(ordersPath);
  await fs.unlink(ticketsPath);

  logger.info(`Monthly report sent to ${admins.length} super admins`);
}

// Initialize schedules
export const initializeScheduler = async () => {
  await scheduleDailyRevenueReport();
  await scheduleWeeklySummaryReport();
  await scheduleMonthlyReport();
  logger.info('All report schedules initialized');
};