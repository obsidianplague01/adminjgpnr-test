// src/app.ts - FIXED VERSION
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validate';
import { 
  apiLimiter, 
  authLimiter, 
  paymentLimiter,
  orderLimiter,
} from './middleware/rateLimit';
import { authenticate , authorizeFileAccess } from './middleware/auth';
import { logger } from './utils/logger';
import { initializeSentry, getSentryMiddleware } from './config/monitoring';

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
import advancedSettingsRoutes from './modules/settings/advancedSettings.routes';
import batchRoutes from './modules/batch/batch.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import paymentRoutes from './modules/payment/payment.routes'; // Add if exists

const app = express();

// Initialize Sentry FIRST
initializeSentry(app);
const sentryMiddleware = getSentryMiddleware();
app.use(sentryMiddleware.requestHandler);
app.use(sentryMiddleware.tracingHandler);

// Health check (should be early for load balancers)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  });
});

// Request logging (but skip health checks)
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global input sanitization (CRITICAL - before routes)
app.use(sanitizeInput);

// Serve static files WITH AUTHENTICATION
app.use('/uploads/qrcodes', authenticate, express.static(path.join(__dirname, '../uploads/qrcodes')));
app.use('/uploads/avatars', authenticate, express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/documents', authenticate, express.static(path.join(__dirname, '../uploads/documents')));

// Trust proxy (if behind nginx/load balancer)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ==================== ROUTES ====================

// Auth routes (CRITICAL: Use authLimiter)
app.use('/api/auth', authLimiter, authRoutes);

// Payment routes (CRITICAL: Use paymentLimiter)
if (paymentRoutes) {
  app.use('/api/payments', paymentLimiter, paymentRoutes);
}

// Protected API routes with general rate limiting
app.use('/api/tickets', apiLimiter, ticketRoutes);
app.use('/api/orders', orderLimiter, orderRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/email', apiLimiter, emailRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/subscribers', apiLimiter, subscriberRoutes);

// Settings routes (admin only, stricter limits)
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/settings/advanced', apiLimiter, advancedSettingsRoutes);

// Analytics routes with export rate limiting on specific endpoints
app.use('/api/analytics', apiLimiter, analyticsRoutes);

// Batch operations (admin only, stricter limits)
app.use('/api/batch', apiLimiter, batchRoutes);

// Monitoring routes (admin only, rate limited)
app.use('/api/monitoring', apiLimiter, monitoringRoutes);

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use(notFoundHandler);

// Sentry error handler (before custom error handler)
app.use(sentryMiddleware.errorHandler);

// Custom error handler (LAST)
app.use(errorHandler);

// Replace static file serving with:
app.use('/uploads/qrcodes', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/qrcodes')));
app.use('/uploads/avatars', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/documents', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/documents')));

export default app;