import cron from 'node-cron';
import { viewService } from '../utils/materialized-views.service';
import { logger } from '../utils/logger';

export function scheduleViewRefresh() {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting materialized view refresh');
    
    try {
      await viewService.refreshAllViews();
      logger.info('Materialized view refresh completed');
    } catch (error) {
      logger.error('Materialized view refresh failed:', error);
    }
  });

  logger.info('Materialized view refresh scheduled (every 5 minutes)');
}

export async function refreshViewsNow(): Promise<void> {
  await viewService.refreshAllViews();
}