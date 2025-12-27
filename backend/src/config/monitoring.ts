import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express, RequestHandler, ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

export const initializeSentry = (app: Express) => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, _hint) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.secret) data.secret = '[REDACTED]';
      }
      return event;
    },
  });

  logger.info('Sentry initialized');
};

export const getSentryMiddleware = (): {
  requestHandler: RequestHandler;
  tracingHandler: RequestHandler;
  errorHandler: ErrorRequestHandler;
} => {
  return {
    requestHandler: Sentry.Handlers.requestHandler() as RequestHandler,
    tracingHandler: Sentry.Handlers.tracingHandler() as RequestHandler,
    errorHandler: Sentry.Handlers.errorHandler() as ErrorRequestHandler,
  };
};
