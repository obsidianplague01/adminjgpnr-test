// src/jobs/email.jobs.ts
import { Worker } from 'bullmq';
import { connection} from '../config/queue';
import { sendEmail } from '../config/email';
import prisma from '../config/database';
import { logger } from '../utils/logger';

/**
 * Single email worker
 */
export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html, text, attachments } = job.data;

    try {
      await sendEmail({
        to,
        subject,
        html,
        text,
        attachments,
      });

      logger.info(`Email sent successfully to ${to}`);
      return { success: true, to };
    } catch (error: any) {
      logger.error(`Email failed to ${to}:`, error);
      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000, // 10 emails per minute
    },
  }
);

/**
 * Campaign worker
 */
export const campaignWorker = new Worker(
  'campaign',
  async (job) => {
    const { campaignId, subscribers } = job.data;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const batchSize = 100;
      let sentCount = 0;

      // Process in batches
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);

        for (const subscriber of batch) {
          try {
            // Replace variables
            const personalizedBody = campaign.body
              .replace(/{name}/g, subscriber.name)
              .replace(/{email}/g, subscriber.email);

            await sendEmail({
              to: subscriber.email,
              subject: campaign.subject,
              html: personalizedBody,
            });

            sentCount++;
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error(`Failed to send campaign to ${subscriber.email}:`, error);
          }
        }

        // Update progress
        job.updateProgress((sentCount / subscribers.length) * 100);
      }

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentTo: sentCount,
        },
      });

      logger.info(`Campaign ${campaignId} sent to ${sentCount}/${subscribers.length} subscribers`);
      return { success: true, sent: sentCount, total: subscribers.length };
    } catch (error: any) {
      logger.error(`Campaign ${campaignId} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Process one campaign at a time
  }
);

/**
 * Order confirmation email
 */
emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed:`, err);
});

campaignWorker.on('completed', (job) => {
  logger.info(`Campaign job ${job.id} completed`);
});

campaignWorker.on('failed', (job, err) => {
  logger.error(`Campaign job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.close();
  await campaignWorker.close();
  logger.info('Email workers shut down');
});