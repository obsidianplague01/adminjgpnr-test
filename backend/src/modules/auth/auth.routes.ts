// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import * as authController from './auth.controller';
import * as twoFactorController from './twoFactor.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import {
  loginSchema,
  refreshTokenSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './auth.schema';

const router = Router();

// Public routes
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.use(authenticateJWT);

router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);

// 2FA routes
router.post('/2fa/generate', twoFactorController.generateSecret);
router.post('/2fa/enable', twoFactorController.enableTwoFactor);
router.post('/2fa/verify', twoFactorController.verifyToken);
router.post('/2fa/disable', twoFactorController.disableTwoFactor);
router.post('/2fa/regenerate-codes', twoFactorController.regenerateBackupCodes);

// User management (Super Admin only)
router.get('/users', requireSuperAdmin, authController.listUsers);
router.get('/users/:id', requireSuperAdmin, authController.getUser);

router.post(
  '/users',
  requireSuperAdmin,
  validate(createUserSchema),
  auditLog('CREATE_USER', 'USER'),
  authController.createUser
);

router.patch(
  '/users/:id',
  requireSuperAdmin,
  validate(updateUserSchema),
  auditLog('UPDATE_USER', 'USER'),
  authController.updateUser
);

router.patch(
  '/users/:id/password',
  authenticateJWT,
  validate(changePasswordSchema),
  auditLog('CHANGE_PASSWORD', 'USER'),
  authController.changePassword
);

router.delete(
  '/users/:id',
  requireSuperAdmin,
  auditLog('DEACTIVATE_USER', 'USER'),
  authController.deactivateUser
);
export default router;