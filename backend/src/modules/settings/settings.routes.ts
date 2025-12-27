// src/modules/settings/settings.routes.ts
import { Router } from 'express';
import * as settingsController from './settings.controller';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';

const router = Router();
router.use(authenticateJWT, requireSuperAdmin);

router.get('/system', settingsController.getSystemSettings);
router.patch('/system', auditLog('UPDATE_SETTINGS', 'SETTINGS'), settingsController.updateSystemSettings);

export default router;