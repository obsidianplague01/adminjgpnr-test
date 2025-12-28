// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { blacklistToken } from '../../middleware/auth';
import { monitoring } from '../../utils/monitoring.service';
import { logger } from '../../utils/logger';

const authService = new AuthService();

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  
  // Log successful login
  logger.info('User logged in', {
    userId: result.user.id,
    email: result.user.email,
    ip: req.ip,
  });

  // Set user context for monitoring
  monitoring.setUser(result.user.id, result.user.email);
  
  res.json(result);
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  
  logger.info('Token refreshed', {
    userId: result.user.id,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * Get current authenticated user
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  res.json(user);
});

/**
 * Logout user (FIXED - now actually invalidates token)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Decode to get expiration
      const decoded = jwt.decode(token) as any;
      
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        
        // Only blacklist if token hasn't expired yet
        if (expiresIn > 0) {
          await blacklistToken(token, expiresIn);
          
          logger.info('User logged out', {
            userId: req.user?.userId,
            email: req.user?.email,
            ip: req.ip,
          });
        }
      }
    }

    // Clear monitoring context
    monitoring.clearUser();
    
    res.json({ 
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Logout error:', error);
    // Still return success to user even if blacklisting fails
    res.json({ message: 'Logged out successfully' });
  }
});

/**
 * Create new user (admin only)
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.createUser(req.body);
  
  logger.info('User created', {
    newUserId: user.id,
    newUserEmail: user.email,
    createdBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.status(201).json(user);
});

/**
 * Update user details (admin only)
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateUser(req.params.id, req.body);
  
  logger.info('User updated', {
    userId: user.id,
    updatedBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.json(user);
});

/**
 * Change user password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  
  // Users can only change their own password unless admin
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
  const isSelf = req.user?.userId === userId;
  
  if (!isAdmin && !isSelf) {
    res.status(403).json({ 
      error: 'You can only change your own password' 
    });
    return;
  }
  
  const result = await authService.changePassword(userId, req.body);
  
  logger.info('Password changed', {
    userId,
    changedBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * List all users (admin only)
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const search = req.query.search as string;
  const role = req.query.role as string;
  const status = req.query.status as string;
  
  const result = await authService.listUsers({
    page,
    limit,
    search,
    role,
    status,
  });
  
  res.json(result);
});

/**
 * Get specific user by ID (admin only)
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.params.id);
  res.json(user);
});

/**
 * Deactivate user account (admin only)
 */
export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  
  // Prevent self-deactivation
  if (req.user?.userId === userId) {
    res.status(400).json({ 
      error: 'You cannot deactivate your own account' 
    });
    return;
  }
  
  const result = await authService.deactivateUser(userId);
  
  logger.warn('User deactivated', {
    userId,
    deactivatedBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * Reactivate user account (admin only)
 */
export const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.reactivateUser(req.params.id);
  
  logger.info('User reactivated', {
    userId: req.params.id,
    reactivatedBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * Delete user permanently (super admin only)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  
  // Prevent self-deletion
  if (req.user?.userId === userId) {
    res.status(400).json({ 
      error: 'You cannot delete your own account' 
    });
    return;
  }
  
  const result = await authService.deleteUser(userId);
  
  logger.warn('User deleted permanently', {
    userId,
    deletedBy: req.user?.userId,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * Get user activity log (admin only)
 */
export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  
  const activity = await authService.getUserActivity(userId, limit);
  res.json(activity);
});

/**
 * Update own profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  // Only allow updating specific fields
  const allowedFields = ['firstName', 'lastName', 'phone'];
  const updates: any = {};
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }
  
  const user = await authService.updateUser(userId, updates);
  
  logger.info('Profile updated', {
    userId,
    ip: req.ip,
  });
  
  res.json(user);
});

/**
 * Enable 2FA for user
 */
export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.enable2FA(req.user!.userId);
  
  logger.info('2FA enabled', {
    userId: req.user!.userId,
    ip: req.ip,
  });
  
  res.json(result);
});

/**
 * Verify 2FA code
 */
export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await authService.verify2FA(req.user!.userId, code);
  
  res.json(result);
});

/**
 * Disable 2FA for user
 */
export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;
  const result = await authService.disable2FA(req.user!.userId, password);
  
  logger.info('2FA disabled', {
    userId: req.user!.userId,
    ip: req.ip,
  });
  
  res.json(result);
});