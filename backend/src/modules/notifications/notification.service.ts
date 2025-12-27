// src/modules/notifications/notification.service.ts
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateNotificationInput } from './notification.schema';
import { emitNotification } from '../../config/websocket';

export class NotificationService {

   

  async createNotification(data: CreateNotificationInput) {
    const notification = await prisma.notification.create({ data });
    
   
    emitNotification(data.userId, notification);
    
    return notification;
  }

  async listNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    return { message: 'Notification deleted' };
  }

  async clearAll(userId: string) {
    await prisma.notification.deleteMany({ where: { userId } });
    return { message: 'All notifications cleared' };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }
}

