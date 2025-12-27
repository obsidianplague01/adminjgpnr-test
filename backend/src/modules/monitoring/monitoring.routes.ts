import { Router } from 'express';
import * as monitoringController from './monitoring.controller';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';

const router = Router();

router.get('/health', monitoringController.getHealthCheck);

router.get('/metrics', authenticateJWT, requireSuperAdmin, monitoringController.getMetrics);
router.get('/websocket', authenticateJWT, requireSuperAdmin, monitoringController.getWebSocketStats);

export default router;