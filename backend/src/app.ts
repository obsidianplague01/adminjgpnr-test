// src/app.ts
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
  fileDownloadLimiter,
} from './middleware/rateLimit';
import { authenticate , authorizeFileAccess } from './middleware/auth';
import { logger } from './utils/logger';
import { initializeSentry, getSentryMiddleware } from './config/monitoring';
import path from 'path';
import { csrfProtection, getCsrfToken, csrfErrorHandler } from './middleware/csrf';
import cookieParser from 'cookie-parser';

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
import paymentRoutes from './modules/payment/payment.routes';

const app = express();

initializeSentry(app);
const sentryMiddleware = getSentryMiddleware();
app.use(sentryMiddleware.requestHandler);
app.use(sentryMiddleware.tracingHandler);

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
      connectSrc: ["'self'"],
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
  
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
  
  hidePoweredBy: true,
  
  crossOriginEmbedderPolicy: false,  
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));


app.use((_req, res, next) => {

  res.setHeader('X-Frame-Options', 'DENY');
  
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=()'
  );
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 
      'max-age=86400, enforce'
    );
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, 
}));
app.use('/api/payments/webhook', express.json({
  verify: (req: any, res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use('/uploads/qrcodes', authenticate, express.static(path.join(__dirname, '../uploads/qrcodes')));
app.use('/uploads/avatars', authenticate, express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/documents', authenticate, express.static(path.join(__dirname, '../uploads/documents')));

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}
app.use('/api/auth', authLimiter, authRoutes);

if (paymentRoutes) {
  app.use('/api/payments', paymentLimiter, paymentRoutes);
}
app.use(cookieParser());

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, getCsrfToken);

// Apply CSRF protection to state-changing routes
app.use('/api/orders', authenticate, csrfProtection, orderRoutes);
app.use('/api/payments', authenticate, csrfProtection, paymentRoutes);
app.use('/api/tickets', authenticate, csrfProtection, ticketRoutes);

// CSRF error handler
app.use(csrfErrorHandler);

app.use('/api/tickets', apiLimiter, ticketRoutes);
app.use('/api/orders', orderLimiter, orderRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/email', apiLimiter, emailRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/subscribers', apiLimiter, subscriberRoutes);

app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/settings/advanced', apiLimiter, advancedSettingsRoutes);

app.use('/api/analytics', apiLimiter, analyticsRoutes);

app.use('/api/batch', apiLimiter, batchRoutes);

app.use('/api/monitoring', apiLimiter, monitoringRoutes);

app.use(notFoundHandler);

app.use(sentryMiddleware.errorHandler);

app.use(errorHandler);

app.use('/uploads/qrcodes', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/qrcodes')));
app.use('/uploads/avatars', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/documents', authenticate, authorizeFileAccess, express.static(path.join(__dirname, '../uploads/documents')));

app.use('/uploads/qrcodes', authenticate, authorizeFileAccess, fileDownloadLimiter, express.static(...));
app.use('/uploads/documents', authenticate, authorizeFileAccess, fileDownloadLimiter, express.static(...));

export default app;