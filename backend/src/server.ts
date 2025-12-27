import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { logger } from './utils/logger';
import { createTransporter } from './config/email';
import { initializeWebSocket, closeWebSocket } from './config/websocket';
import { initializeSentry } from './config/monitoring';
import { initializeStorage, cleanupTempFiles } from './config/storage';
import prisma from './config/database';
import { emailWorker, campaignWorker } from './jobs/email.jobs';
import { reportWorker, initializeScheduler } from './jobs/scheduler.jobs';
import { analyticsWorker, initializeAnalyticsJobs } from './jobs/analytics.jobs';
import { scheduleViewRefresh } from './jobs/view-refresh.job';
import cron from 'node-cron';

const PORT = process.env.PORT || 5000;

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'QR_ENCRYPTION_KEY',
  'REDIS_HOST',
  'REDIS_PORT',
  'PAYSTACK_SECRET_KEY', // Primary payment gateway
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const startServer = async () => {
  try {
    initializeSentry(app);
    logger.info('Sentry initialized');

    // Initialize local file storage
    initializeStorage();

    await prisma.$connect();
    logger.info('Database connected successfully');

    await createTransporter();
    logger.info('SMTP transporter initialized');

    await initializeScheduler();
    logger.info('Report scheduler initialized');

    await initializeAnalyticsJobs();
    logger.info('Analytics jobs initialized');

    scheduleViewRefresh();
    logger.info('Materialized view refresh scheduled');

    // Schedule temp file cleanup (daily at 2 AM)
    cron.schedule('0 2 * * *', () => {
      logger.info('Running temp file cleanup...');
      cleanupTempFiles();
    });

    logger.info('Queue workers started');

    const httpServer = http.createServer(app);

    await initializeWebSocket(httpServer);
    logger.info('WebSocket server initialized with Redis adapter');

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`WebSocket: ws://localhost:${PORT}`);
      logger.info(`Analytics: http://localhost:${PORT}/api/analytics`);
      logger.info(`File uploads: ${process.env.UPLOADS_DIR || './uploads'}`);
      logger.info(`Payment: Paystack (Primary)${process.env.FLUTTERWAVE_SECRET_KEY ? ' + Flutterwave (Optional)' : ''}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        await closeWebSocket();

        await prisma.$disconnect();
        logger.info('Database disconnected');

        await emailWorker.close();
        await campaignWorker.close();
        await reportWorker.close();
        await analyticsWorker.close();
        logger.info('Queue workers closed');

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();