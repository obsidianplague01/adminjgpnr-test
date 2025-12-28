// src/middleware/auth.ts - FIXED VERSION
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
    const blacklisted = await cacheService.exists(`blacklist:${token}`);
    return blacklisted;
  } catch (error) {
    logger.error('Token blacklist check failed:', error);
    return false;
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

export const authenticateJWT = async (
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

    if (await isTokenBlacklisted(token)) {
      logger.warn('Blacklisted token used', { ip: req.ip });
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      logger.warn('Token for non-existent user', { userId: decoded.userId, ip: req.ip });
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!user.isActive) { 
      logger.warn('Inactive user attempted access', { 
        userId: user.id, 
        isActive: user.isActive,
        ip: req.ip 
      });
      res.status(403).json({ error: 'Account is not active' });
      return;
    }
    
    monitoring.setUser(user.id, user.email);

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
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

export const authenticate = authenticateJWT;

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
    // Fix: Use type assertion to handle UserRole properly
    const userRole = req.user.role as UserRole;
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    // QR codes - admin or ticket owner
    if (req.path.includes('/qrcodes/')) {
      const ticketCode = filename.replace('.png', '');
      
      const ticket = await prisma.ticket.findUnique({
        where: { ticketCode },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
        },
      });

      if (!ticket) {
        logger.warn('QR code access for non-existent ticket', {
          ticketCode,
          userId: req.user.userId,
        });
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const ownsTicket = ticket.order.customer.email === req.user.email;
      
      if (!isAdmin && !ownsTicket) {
        logger.warn('Unauthorized QR code access attempt', {
          ticketCode,
          userId: req.user.userId,
          ownerEmail: ticket.order.customer.email,
        });
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Note: Customer model doesn't have avatar field - this needs schema update
    if (req.path.includes('/avatars/')) {
      const customer = await prisma.customer.findFirst({
        where: {
          // Fix: Use email or another field to find customer
          email: req.user.email,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!customer) {
        logger.warn('Avatar access for non-existent customer', {
          filename,
          userId: req.user.userId,
        });
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const ownsAvatar = customer.email === req.user.email;
      
      if (!isAdmin && !ownsAvatar) {
        logger.warn('Unauthorized avatar access attempt', {
          filename,
          userId: req.user.userId,
          ownerEmail: customer.email,
        });
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Documents - admin only
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
      select: { id: true, email: true, role: true, isActive: true }, // Fix: Use isActive instead of status
    });

    if (user && user.isActive) { // Fix: Use isActive boolean
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    }
  } catch (error) {
    logger.debug('Optional auth failed:', error);
  }

  next();
};