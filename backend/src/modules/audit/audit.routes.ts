import { Router } from 'express';
import * as auditController from './audit.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// Only admins can access audit logs
router.use(authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

// Get audit logs with filters
router.get('/logs', auditController.getAuditLogs);

// Get audit statistics
router.get('/stats', auditController.getAuditStats);

// Get user activity
router.get('/user/:userId', auditController.getUserActivity);

// Get entity history
router.get('/entity/:entity/:entityId', auditController.getEntityHistory);

// Get security events
router.get('/security-events', auditController.getSecurityEvents);

// Export audit logs (Super Admin only)
router.get('/export',
  authorize([UserRole.SUPER_ADMIN]),
  auditController.exportAuditLogs
);

export default router;