// src/app.ts 
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import cookieParser from 'cookie-parser';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validate';
import { authenticate, authorizeFileAccess } from './middleware/auth';
import { csrfProtection, getCsrfToken, csrfErrorHandler } from './middleware/csrf';
import rateLimit from 'express-rate-limit';
import * as paymentController from './modules/payment/payment.controller';
import { Request, Response, NextFunction } from 'express';

import { 
  apiLimiter, 
  authLimiter, 
  paymentLimiter,
  orderLimiter,
  fileDownloadLimiter,
} from './middleware/rateLimit';

// Monitoring
import { initializeSentry, getSentryMiddleware } from './config/monitoring';
import { logger } from './utils/logger';

// Routes
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
import paymentRoutes from './modules/payment/payment.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();
const API_VERSION = 'v1';
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

initializeSentry(app);
const sentryMiddleware = getSentryMiddleware();
app.use(sentryMiddleware.requestHandler);
app.use(sentryMiddleware.tracingHandler);

app.use('/api/payments/webhook', express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  });
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'], // ✅ Add WebSocket
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  hidePoweredBy: true,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeInput);

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.get('/api/csrf-token', 
  rateLimit({ windowMs: 60000, max: 30 }), 
  getCsrfToken
);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);

app.use(`/api/${API_VERSION}/orders`, authenticate, csrfProtection, orderLimiter, orderRoutes);
app.use(`/api/${API_VERSION}/payments`, authenticate, csrfProtection, paymentLimiter, paymentRoutes);
app.use(`/api/${API_VERSION}/tickets`, authenticate, csrfProtection, ticketRoutes);
app.use(`/api/${API_VERSION}/customers`, authenticate, csrfProtection, customerRoutes);
app.use(`/api/${API_VERSION}/email`, authenticate, csrfProtection, emailRoutes);
app.use(`/api/${API_VERSION}/batch`, authenticate, csrfProtection, batchRoutes);


app.use(`/api/${API_VERSION}/analytics`, authenticate, analyticsRoutes);
app.use(`/api/${API_VERSION}/notifications`, authenticate, notificationRoutes);
app.use(`/api/${API_VERSION}/subscribers`, authenticate, subscriberRoutes);
app.use(`/api/${API_VERSION}/settings`, authenticate, settingsRoutes);
app.use(`/api/${API_VERSION}/settings/advanced`, authenticate, advancedSettingsRoutes);
app.use(`/api/${API_VERSION}/monitoring`, authenticate, monitoringRoutes);
app.use(`/api/${API_VERSION}/audit`, authenticate, auditRoutes);

app.post('/api/payments/webhook', 
  webhookLimiter,
  paymentController.handleWebhook
);
app.use('/uploads/qrcodes', 
  authenticate, 
  authorizeFileAccess, 
  fileDownloadLimiter, 
  express.static(path.join(__dirname, '../uploads/qrcodes'))
);

app.use('/uploads/documents', 
  authenticate, 
  authorizeFileAccess, 
  fileDownloadLimiter, 
  express.static(path.join(__dirname, '../uploads/documents'))
);

app.use('/uploads/avatars', 
  authenticate, 
  authorizeFileAccess,
  fileDownloadLimiter,
  express.static(path.join(__dirname, '../uploads/avatars'))
);

app.use(csrfErrorHandler);
app.use(notFoundHandler);
app.use(sentryMiddleware.errorHandler);
app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error:', err);
  
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.statusCode || 500).json({
    error: err.message,
    ...(isDev && { stack: err.stack }),
  });
});
app.use(errorHandler);

export default app;