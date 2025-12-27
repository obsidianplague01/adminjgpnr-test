// src/modules/notifications/notification.routes.ts
import { Router } from 'express';
import * as notificationController from './notification.controller';
import { authenticateJWT } from '../../middleware/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/clear-all', notificationController.clearAll);

export default router;