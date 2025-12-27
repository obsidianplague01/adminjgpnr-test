// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validate';
import { apiLimiter } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { initializeSentry, getSentryMiddleware } from './config/monitoring';
import advancedSettingsRoutes from './modules/settings/advancedSettings.routes';
// Import routes
import authRoutes from './modules/auth/auth.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import orderRoutes from './modules/orders/order.routes';
import customerRoutes from './modules/customers/customer.routes';
import emailRoutes from './modules/email/email.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import subscriberRoutes from './modules/subscribers/subscriber.routes';
import settingsRoutes from './modules/settings/settings.routes';

const app = express();

initializeSentry(app);

const sentryMiddleware = getSentryMiddleware();

//  Sentry request handler  
app.use(sentryMiddleware.requestHandler);
app.use(sentryMiddleware.tracingHandler);
app.use('/api/settings/advanced', apiLimiter, advancedSettingsRoutes);
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Security middleware

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});


app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', apiLimiter, ticketRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/email', apiLimiter, emailRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/subscribers', apiLimiter, subscriberRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);

// 404 handler
app.use(notFoundHandler);

//  Sentry error handler
app.use(sentryMiddleware.errorHandler);
app.use(errorHandler);
// Error handler 
app.use(errorHandler);

export default app;