// src/config/websocket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import prisma from './database';

let io: Server;

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

interface AuthSocket extends Socket {
  user?: SocketUser;
}

/**
 * Initialize WebSocket server
 */
export const initializeWebSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.error('JWT_SECRET not configured');
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, jwtSecret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error: any) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthSocket) => {
    logger.info(`Client connected: ${socket.id} (User: ${socket.user?.email})`);

    // Join user-specific room
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      
      // Join admin room if user is admin
      if (socket.user.role === 'admin' || socket.user.role === 'superadmin') {
        socket.join('admins');
      }
    }

    // Handle ticket scan events
    socket.on('scan:ticket', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        logger.info(`Ticket scan event from ${socket.user.email}:`, data);
        
        // Emit to admins room
        io.to('admins').emit('scan:new', {
          ticketCode: data.ticketCode,
          scannedBy: socket.user.email,
          timestamp: new Date(),
        });
      } catch (error: any) {
        logger.error('Ticket scan event error:', error);
        socket.emit('error', { message: 'Failed to process scan event' });
      }
    });

    // Handle order updates
    socket.on('order:update', async (data) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        logger.info(`Order update event from ${socket.user.email}:`, data);
        
        // Emit to specific user and admins
        io.to(`user:${data.customerId}`).emit('order:updated', data);
        io.to('admins').emit('order:updated', data);
      } catch (error: any) {
        logger.error('Order update event error:', error);
        socket.emit('error', { message: 'Failed to process order update' });
      }
    });

    // Handle analytics requests
    socket.on('analytics:subscribe', async () => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Only allow admin users
        if (socket.user.role !== 'admin' && socket.user.role !== 'superadmin') {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }

        socket.join('analytics');
        logger.info(`User ${socket.user.email} subscribed to analytics`);
      } catch (error: any) {
        logger.error('Analytics subscribe error:', error);
        socket.emit('error', { message: 'Failed to subscribe to analytics' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('WebSocket server initialized');
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

/**
 * Emit event to specific user
 */
export const emitToUser = (userId: string, event: string, data: any) => {
  try {
    if (!io) {
      logger.warn('WebSocket not initialized, cannot emit to user');
      return;
    }
    io.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    logger.error('Error emitting to user:', error);
  }
};

/**
 * Emit event to all admin users
 */
export const emitToAdmins = (event: string, data: any) => {
  try {
    if (!io) {
      logger.warn('WebSocket not initialized, cannot emit to admins');
      return;
    }
    io.to('admins').emit(event, data);
  } catch (error) {
    logger.error('Error emitting to admins:', error);
  }
};

/**
 * Emit event to all connected clients
 */
export const emitToAll = (event: string, data: any) => {
  try {
    if (!io) {
      logger.warn('WebSocket not initialized, cannot emit to all');
      return;
    }
    io.emit(event, data);
  } catch (error) {
    logger.error('Error emitting to all:', error);
  }
};