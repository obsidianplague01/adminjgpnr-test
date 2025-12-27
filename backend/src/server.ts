// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { logger } from './utils/logger';
import { createTransporter } from './config/email';
import { initializeWebSocket } from './config/websocket';
import { initializeSentry } from './config/monitoring';
import prisma from './config/database';
import { emailWorker, campaignWorker } from './jobs/email.jobs';
import { reportWorker, initializeScheduler } from './jobs/scheduler.jobs';
import { analyticsWorker, initializeAnalyticsJobs } from './jobs/analytics.jobs';
import fs from 'fs';

const PORT = process.env.PORT || 5000;

// Create required directories
const directories = [
  'logs',
  'uploads',
  'uploads/qrcodes',
  'uploads/tickets',
  'uploads/documents',
  'uploads/customer-documents',
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Validate required environment variables
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
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Start server
const startServer = async () => {
  try {
    // Initialize Sentry
    initializeSentry(app);
    logger.info('Sentry initialized');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize email transporter
    await createTransporter();
    logger.info('SMTP transporter initialized');

    // Initialize scheduler
    await initializeScheduler();
    logger.info('Report scheduler initialized');

    // Initialize analytics jobs
    await initializeAnalyticsJobs();
    logger.info('Analytics jobs initialized');

    // Start queue workers
    logger.info('Queue workers started');

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize WebSocket
    initializeWebSocket(httpServer);
    logger.info('WebSocket server initialized');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`WebSocket: ws://localhost:${PORT}`);
      logger.info(`Analytics: http://localhost:${PORT}/api/analytics`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database disconnected');

        // Close queue workers
        await emailWorker.close();
        await campaignWorker.close();
        await reportWorker.close();
        await analyticsWorker.close();
        logger.info('Queue workers closed');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();