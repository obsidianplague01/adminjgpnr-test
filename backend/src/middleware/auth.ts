// src/middleware/auth.ts 
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';
import { monitoring } from '../utils/monitoring.service';
import prisma from '../config/database';
import { cacheService } from '../utils/cache.service';
import path from 'path';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}


const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const exists = await cacheService.exists(`blacklist:${token}`);
    return exists;
  } catch (error) {
    logger.error('Token blacklist check failed:', error);
    throw new Error('Token verification unavailable');
  }
};

export const blacklistToken = async (token: string, expiresIn: number): Promise<void> => {
  try {
    await cacheService.set(`blacklist:${token}`, true, expiresIn);
    logger.info('Token blacklisted');
  } catch (error) {
    logger.error('Token blacklist failed:', error);
    throw error;
  }
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      monitoring.addBreadcrumb('Auth attempt without token', { ip: req.ip });
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Check blacklist
    if (await isTokenBlacklisted(token)) {
      logger.warn('Blacklisted token used', { ip: req.ip });
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Fetch user & verify active status + token version
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        isActive: true, 
        tokenVersion: true 
      },
    });

    if (!user) {
      logger.warn('Token for non-existent user', { 
        userId: decoded.userId, 
        ip: req.ip 
      });
      res.status(401).json({ error: 'User not found' });
      return;
    }


   if (decoded.tokenVersion !== user.tokenVersion) {
    
      if (decoded.iat) {
        const tokenIssuedDate = new Date(decoded.iat * 1000); 
        
        const versionChangeLog = await prisma.auditLog.findFirst({
          where: {
            userId: user.id,
            action: 'PASSWORD_CHANGED',
            createdAt: { 
              gte: tokenIssuedDate
            }
          }
        });
        
        if (versionChangeLog && decoded.exp) { 
          const remainingTTL = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
            
          if (remainingTTL > 0) {
            await blacklistToken(token, remainingTTL);
          }
        }
      }
      
      res.status(401).json({ error: 'Token invalidated due to password change' });
      return;
    }
    if (!user.isActive) {
      logger.warn('Inactive user attempted access', { 
        userId: user.id,
        ip: req.ip 
      });
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    // Set user context
    monitoring.setUser(user.id, user.email);
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.info('Expired token used', { ip: req.ip, exp: error.expiredAt });
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token format', { ip: req.ip, message: error.message });
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    logger.error('JWT verification error:', error);
    monitoring.captureException(error as Error, { ip: req.ip });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const authenticateJWT = authenticate;

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.userId,
        required: roles,
        current: req.user.role,
        path: req.path,
      });

      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role 
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
export const requireAdmin = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
export const requireStaff = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF);


export const authorize = requireRole;

export const authorizeFileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const filename = path.basename(req.path);
    const userRole = req.user.role as UserRole;
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    
    if (req.path.includes('/qrcodes/')) {
      if (!isAdmin) {
        logger.warn('Non-admin QR code access attempt', {
          userId: req.user.userId,
          role: req.user.role,
          path: req.path,
        });
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const ticketCode = filename.replace('.png', '');
      const exists = await prisma.ticket.findUnique({
        where: { ticketCode },
        select: { id: true },
      });

      if (!exists) {
        logger.warn('QR code access for non-existent ticket', {
          ticketCode,
          userId: req.user.userId,
        });
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
    }

    
    if (req.path.includes('/avatars/')) {
      if (!isAdmin) {
        logger.warn('Non-admin avatar access attempt', {
          userId: req.user.userId,
          role: req.user.role,
        });
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    if (req.path.includes('/documents/')) {
      if (!isAdmin) {
        logger.warn('Non-admin document access attempt', {
          filename,
          userId: req.user.userId,
          role: req.user.role,
        });
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('File access authorization error:', error);
    monitoring.captureException(error as Error, {
      path: req.path,
      userId: req.user?.userId,
    });
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        isActive: true,
        tokenVersion: true,
      },
    });

    if (user && user.isActive && 
        (decoded.tokenVersion === undefined || user.tokenVersion === decoded.tokenVersion)) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };
    }
  } catch (error) {
    logger.debug('Optional auth failed:', error);
  }

  next();
};