// src/modules/email/email.schema.ts
import { z } from 'zod';

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name required').max(100),
    subject: z.string().min(1, 'Subject required').max(200),
    body: z.string().min(1, 'Body required').max(50000),
    category: z.string().min(1).max(50),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    subject: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(50000).optional(),
    category: z.string().min(1).max(50).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const sendEmailSchema = z.object({
  body: z.object({
    to: z.string().email('Invalid email'),
    subject: z.string().min(1, 'Subject required').max(200),
    body: z.string().min(1, 'Body required'),
    templateId: z.string().cuid().optional(),
  }),
});

export const createCampaignSchema = z.object({
  body: z.object({
    subject: z.string().min(1, 'Subject required').max(200),
    body: z.string().min(1, 'Body required').max(50000),
    templateId: z.string().cuid().optional(),
  }),
});

export const sendCampaignSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
export type SendEmailInput = z.infer<typeof sendEmailSchema>['body'];
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>['body'];