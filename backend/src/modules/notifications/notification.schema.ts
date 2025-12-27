// src/modules/notifications/notification.schema.ts
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const createNotificationSchema = z.object({
  body: z.object({
    userId: z.string().cuid(),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    type: z.nativeEnum(NotificationType).default(NotificationType.INFO),
    actionUrl: z.string().url().optional(),
  }),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>['body'];

