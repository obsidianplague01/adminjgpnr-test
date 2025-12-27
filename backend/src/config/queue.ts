// src/config/queue.ts
import { Queue,QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

connection.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Email Queue
export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

// Campaign Queue
export const campaignQueue = new Queue('campaign', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Cleanup Queue (cron jobs)
export const cleanupQueue = new Queue('cleanup', {
  connection,
  defaultJobOptions: {
    attempts: 2,
  },
});

// Queue Events
const emailQueueEvents = new QueueEvents('email', { connection });
const campaignQueueEvents = new QueueEvents('campaign', { connection });

emailQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Email job ${jobId} completed`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Email job ${jobId} failed:`, failedReason);
});

campaignQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Campaign job ${jobId} completed`);
});

campaignQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Campaign job ${jobId} failed:`, failedReason);
});

export { connection };