// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import path from 'path';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    logger.error('JWT verification error:', error);
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

/**
 * Middleware to verify user can access a specific uploaded file
 */
export const authorizeFileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filename = path.basename(req.path);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // QR codes - check if user owns the ticket
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
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
      const ownsTicket = ticket.order.customer.email === req.user.email;
      
      if (!isAdmin && !ownsTicket) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Avatars - check if user owns the avatar
    if (req.path.includes('/avatars/')) {
      const customer = await prisma.customer.findFirst({
        where: {
          avatar: { contains: filename },
        },
      });

      if (!customer) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
      const ownsAvatar = customer.email === req.user.email;
      
      if (!isAdmin && !ownsAvatar) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Documents - admin only
    if (req.path.includes('/documents/')) {
      const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
      
      if (!isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('File access authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};