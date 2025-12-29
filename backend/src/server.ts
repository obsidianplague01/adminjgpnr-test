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

const validateSecrets = () => {
  const secrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    QR_ENCRYPTION_KEY: process.env.QR_ENCRYPTION_KEY,
  };

  for (const [name, value] of Object.entries(secrets)) {
    if (!value) {
      logger.error(`Missing required secret: ${name}`);
      process.exit(1);
    }

    // ✅ Validate length
    if (value.length < 32) {
      logger.error(`Secret ${name} too short (minimum 32 characters)`);
      process.exit(1);
    }

    // ✅ Validate entropy
    const uniqueChars = new Set(value.split('')).size;
    if (uniqueChars < 16) {
      logger.error(`Secret ${name} has insufficient entropy`);
      process.exit(1);
    }

    // ✅ Warn if weak
    if (/^[a-z0-9]+$/i.test(value)) {
      logger.warn(`Secret ${name} should contain special characters`);
    }
  }

  logger.info('All secrets validated');
};

const validateEnvironment = () => {
  const errors: string[] = [];
  
  // Required variables
  const required = [
    'DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET',
    'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD',
    'QR_ENCRYPTION_KEY', 'REDIS_HOST', 'PAYSTACK_SECRET_KEY'
  ];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push(`Missing required variable: ${varName}`);
    }
  }
  
  // Validate JWT secrets (min 32 chars, high entropy)
  const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const secret of secrets) {
    const value = process.env[secret];
    if (value) {
      if (value.length < 32) {
        errors.push(`${secret} must be at least 32 characters`);
      }
      if (new Set(value).size < 16) {
        errors.push(`${secret} has insufficient entropy`);
      }
      if (value === 'your_jwt_secret_key_here') {
        errors.push(`${secret} must be changed from placeholder`);
      }
    }
  }
  
  // Validate QR encryption key (must be 64 char hex)
  const qrKey = process.env.QR_ENCRYPTION_KEY;
  if (qrKey) {
    if (!/^[0-9a-fA-F]{64}$/.test(qrKey)) {
      errors.push('QR_ENCRYPTION_KEY must be 64 character hex string');
    }
  }
  
  // Validate BCRYPT_ROUNDS
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '14');
  if (rounds < 12 || rounds > 16) {
    errors.push('BCRYPT_ROUNDS must be between 12 and 16');
  }
  
  // Validate CORS origins
  const origins = process.env.CORS_ORIGIN?.split(',') || [];
  for (const origin of origins) {
    try {
      new URL(origin);
    } catch {
      errors.push(`Invalid CORS origin: ${origin}`);
    }
  }
  
  if (errors.length > 0) {
    logger.error('Environment validation failed:', errors);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
  
  logger.info('Environment validation passed');
};


process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

validateEnvironment();
validateSecrets();
startServer();