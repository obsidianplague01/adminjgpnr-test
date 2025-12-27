// src/config/websocket.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { JWTPayload } from '../middleware/auth';

let io: SocketIOServer;

export const initializeWebSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.userId;
    const userRole = socket.data.user.role;

    logger.info(`WebSocket connected: ${userId}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-specific rooms
    socket.join(`role:${userRole}`);

    // Admin joins admin room
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      socket.join('admins');
    }

    // Handle client events
    socket.on('subscribe:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.debug(`User ${userId} subscribed to order ${orderId}`);
    });

    socket.on('subscribe:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      logger.debug(`User ${userId} subscribed to ticket ${ticketId}`);
    });

    socket.on('unsubscribe:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('unsubscribe:ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${userId}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

// Notification emitters
export const emitNotification = (userId: string, notification: any) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

export const emitToAdmins = (event: string, data: any) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

export const emitOrderUpdate = (orderId: string, data: any) => {
  if (io) {
    io.to(`order:${orderId}`).emit('order:update', data);
  }
};

export const emitTicketUpdate = (ticketId: string, data: any) => {
  if (io) {
    io.to(`ticket:${ticketId}`).emit('ticket:update', data);
  }
};

export const emitScanEvent = (scanData: any) => {
  if (io) {
    io.to('admins').emit('scan:new', scanData);
  }
};

