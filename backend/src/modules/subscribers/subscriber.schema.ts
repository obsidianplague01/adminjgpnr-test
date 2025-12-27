// src/modules/subscribers/subscriber.schema.ts
import { z } from 'zod';

export const createSubscriberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email').toLowerCase().trim(),
    name: z.string().min(1, 'Name required').max(100).trim(),
    source: z.string().max(50).default('manual'),
  }),
});

export const updateSubscriberSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    status: z.enum(['active', 'unsubscribed']).optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const listSubscribersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.enum(['active', 'unsubscribed']).optional(),
    search: z.string().optional(),
  }),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>['body'];
export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>['body'];
export type ListSubscribersInput = z.infer<typeof listSubscribersSchema>['query'];


