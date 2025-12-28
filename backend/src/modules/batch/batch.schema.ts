// src/modules/batch/batch.schema.ts 
import { z } from 'zod';

export const bulkCreateTicketsSchema = z.object({
  body: z.object({
    orderId: z.string().cuid('Invalid order ID'),
    gameSession: z.string().min(1, 'Game session is required').max(100),
    quantity: z.number().int().min(1).max(500, 'Quantity must be between 1 and 500'),
    validityDays: z.number().int().min(1).max(365).optional(),
  }),
});

export const bulkCancelTicketsSchema = z.object({
  body: z.object({
    ticketIds: z.array(z.string().cuid()).min(1, 'At least one ticket ID required').max(500, 'Maximum 500 tickets'),
  }),
});

export const bulkUpdateSessionsSchema = z.object({
  body: z.object({
    ticketIds: z.array(z.string().cuid()).min(1).max(500),
    newSession: z.string().min(1).max(100),
  }),
});

export const bulkImportCustomersSchema = z.object({
  body: z.object({
    customers: z.array(
      z.object({
        firstName: z.string().min(1).max(100).trim(),
        lastName: z.string().min(1).max(100).trim(),
        email: z.string().email().toLowerCase().trim(),
        phone: z.string().min(10).max(20),
        location: z.string().min(1).max(200),
      })
    ).min(1).max(1000, 'Maximum 1000 customers per import'),
  }),
});

export const bulkSendEmailsSchema = z.object({
  body: z.object({
    customerIds: z.array(z.string().cuid()).min(1).max(1000),
    subject: z.string().min(1).max(200).trim(),
    body: z.string().min(1).max(50000),
  }),
});

export type BulkCreateTicketsInput = z.infer<typeof bulkCreateTicketsSchema>['body'];
export type BulkCancelTicketsInput = z.infer<typeof bulkCancelTicketsSchema>['body'];
export type BulkUpdateSessionsInput = z.infer<typeof bulkUpdateSessionsSchema>['body'];
export type BulkImportCustomersInput = z.infer<typeof bulkImportCustomersSchema>['body'];
export type BulkSendEmailsInput = z.infer<typeof bulkSendEmailsSchema>['body'];