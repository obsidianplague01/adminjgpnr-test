import { Router } from 'express';
import * as auditController from './audit.controller';
import { authenticate, authorize, requireAdmin } from '../../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.use(requireAdmin);

router.get('/logs', auditController.getAuditLogs);

router.get('/stats', auditController.getAuditStats);

router.get('/user/:userId', auditController.getUserActivity);

router.get('/entity/:entity/:entityId', auditController.getEntityHistory);

router.get('/security-events', auditController.getSecurityEvents);

router.get('/export',
  authorize([UserRole.SUPER_ADMIN]),
  auditController.exportAuditLogs
);

export default router;