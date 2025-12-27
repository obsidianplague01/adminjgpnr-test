// src/modules/monitoring/monitoring.routes.ts
import { Router } from 'express';
import * as monitoringController from './monitoring.controller';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';

const router = Router();

// Public health check (no auth)
router.get('/health', monitoringController.getHealthCheck);

// Detailed metrics (admin only)
router.get('/metrics', authenticateJWT, requireSuperAdmin, monitoringController.getMetrics);

export default router;