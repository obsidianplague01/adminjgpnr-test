// src/utils/monitoring.service.ts
import * as Sentry from '@sentry/node';
import prisma from '../config/database';
import redis from '../config/cache';


export class MonitoringService {
  /**
   * Check database health
   */
  async checkDatabase(): Promise<{ healthy: boolean; responseTime: number }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        healthy: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        healthy: false,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis(): Promise<{ healthy: boolean; responseTime: number }> {
    const start = Date.now();
    try {
      await redis.ping();
      return {
        healthy: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        healthy: false,
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const [db, cache, memory, uptime] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getMemoryUsage(),
      process.uptime(),
    ]);

    return {
      database: db,
      redis: cache,
      memory,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
  }

  /**
   * Track custom metric
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>) {
    Sentry.metrics.gauge(name, value, { tags });
  }

  /**
   * Track performance
   */
  trackPerformance(operation: string, duration: number) {
    Sentry.metrics.distribution('operation.duration', duration, {
      tags: { operation },
    });
  }

  /**
   * Capture exception with context
   */
  captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(userId: string, email: string) {
    Sentry.setUser({ id: userId, email });
  }

  /**
   * Clear user context
   */
  clearUser() {
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, data?: Record<string, any>) {
    Sentry.addBreadcrumb({
      message,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    return Sentry.startTransaction({ name, op });
  }
}

export const monitoring = new MonitoringService();
