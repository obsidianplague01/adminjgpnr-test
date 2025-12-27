// src/middleware/fileAccess.ts
import { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth';
import { AppError } from './errorHandler';
import prisma from '../config/database';
import path from 'path';

/**
 * Middleware to verify user can access a specific uploaded file
 */
export const authorizeFileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filename = path.basename(req.path);
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError(401, 'Authentication required');
    }

    // QR codes - check if user owns the ticket
    if (req.path.startsWith('/uploads/qrcodes')) {
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
        throw new AppError(404, 'Ticket not found');
      }

      // Allow if user is admin or owns the ticket
      if (req.user.role !== 'admin' && ticket.order.customer.email !== req.user.email) {
        throw new AppError(403, 'Access denied');
      }
    }

    // Avatars - check if user owns the avatar
    if (req.path.startsWith('/uploads/avatars')) {
      const customer = await prisma.customer.findFirst({
        where: {
          avatar: req.path,
        },
      });

      if (!customer) {
        throw new AppError(404, 'File not found');
      }

      // Allow if user is admin or owns the avatar
      if (req.user.role !== 'admin' && customer.email !== req.user.email) {
        throw new AppError(403, 'Access denied');
      }
    }

    // Documents - admin only
    if (req.path.startsWith('/uploads/documents')) {
      if (req.user.role !== 'admin') {
        throw new AppError(403, 'Admin access required');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};