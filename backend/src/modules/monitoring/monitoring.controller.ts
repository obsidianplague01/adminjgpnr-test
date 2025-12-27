import { Request, Response } from 'express';
import { monitoring } from '../../utils/monitoring.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { getConnectionStats } from '../../config/websocket';

export const getHealthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await monitoring.getSystemMetrics();
  const isHealthy = metrics.database.healthy && metrics.redis.healthy && metrics.memory.heapUsed < 1024;
  res.status(isHealthy ? 200 : 503).json({ status: isHealthy ? 'healthy' : 'unhealthy', ...metrics });
});

export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await monitoring.getSystemMetrics();
  res.json(metrics);
});

export const getWebSocketStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getConnectionStats();
  res.json(stats);
});