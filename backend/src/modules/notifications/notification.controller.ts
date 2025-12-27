// src/modules/notifications/notification.controller.ts
import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { asyncHandler } from '../../middleware/errorHandler';

const notificationService = new NotificationService();

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await notificationService.listNotifications(req.user!.userId, page, limit);
  res.json(result);
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user!.userId);
  res.json(notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.userId);
  res.json(result);
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user!.userId);
  res.json(result);
});

export const clearAll = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.clearAll(req.user!.userId);
  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.getUnreadCount(req.user!.userId);
  res.json(result);
});

