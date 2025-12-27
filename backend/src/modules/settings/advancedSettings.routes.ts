import { Router } from 'express';
import * as settingsController from './advancedSettings.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import {
  updateRegionalSettingsSchema,
  updateOperatingHoursSchema,
  updateEmailFooterSchema,
  updatePaymentGatewaySchema,
  updateTransactionSettingsSchema,
  updateNotificationPreferencesSchema,
} from './advancedSettings.schema';

const router = Router();
router.use(authenticateJWT, requireSuperAdmin);

// Get all settings
router.get('/all', settingsController.getAllSettings);

// Regional settings
router.patch(
  '/regional',
  validate(updateRegionalSettingsSchema),
  auditLog('UPDATE_REGIONAL_SETTINGS', 'SETTINGS'),
  settingsController.updateRegionalSettings
);

// Operating hours
router.patch(
  '/operating-hours',
  validate(updateOperatingHoursSchema),
  auditLog('UPDATE_OPERATING_HOURS', 'SETTINGS'),
  settingsController.updateOperatingHours
);

// Email footer
router.patch(
  '/email-footer',
  validate(updateEmailFooterSchema),
  auditLog('UPDATE_EMAIL_FOOTER', 'SETTINGS'),
  settingsController.updateEmailFooter
);

// Payment gateway
router.patch(
  '/payment-gateway',
  validate(updatePaymentGatewaySchema),
  auditLog('UPDATE_PAYMENT_GATEWAY', 'SETTINGS'),
  settingsController.updatePaymentGateway
);

// Transaction settings
router.patch(
  '/transaction',
  validate(updateTransactionSettingsSchema),
  auditLog('UPDATE_TRANSACTION_SETTINGS', 'SETTINGS'),
  settingsController.updateTransactionSettings
);

// Notification preferences
router.patch(
  '/notifications',
  validate(updateNotificationPreferencesSchema),
  auditLog('UPDATE_NOTIFICATION_PREFERENCES', 'SETTINGS'),
  settingsController.updateNotificationPreferences
);

// Login activity & sessions
router.get('/login-activity', settingsController.getLoginActivities);
router.get('/sessions', settingsController.getActiveSessions);
router.delete('/sessions/:sessionId', settingsController.terminateSession);
router.delete('/sessions', settingsController.terminateAllSessions);

export default router;
