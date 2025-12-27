// src/modules/tickets/ticket.schema.ts
import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

export const createTicketSchema = z.object({
  body: z.object({
    orderId: z.string().cuid('Invalid order ID'),
    gameSession: z.string().min(1, 'Game session required').max(100),
    quantity: z.number().int().min(1).max(50).default(1),
    validityDays: z.number().int().min(1).max(365).optional(),
  }),
});

export const updateTicketSchema = z.object({
  body: z.object({
    gameSession: z.string().min(1).max(100).optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    validUntil: z.string().datetime().optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid ticket ID'),
  }),
});

export const scanTicketSchema = z.object({
  body: z.object({
    ticketCode: z
      .string()
      .min(1, 'Ticket code required')
      .regex(/^JGPNR-\d{4}-[A-Z0-9]{6}$/, 'Invalid ticket code format'),
    scannedBy: z.string().min(1, 'Scanner ID required').max(100),
    location: z.string().max(200).optional(),
  }),
});

export const validateTicketSchema = z.object({
  body: z.object({
    ticketCode: z
      .string()
      .min(1, 'Ticket code required')
      .regex(/^JGPNR-\d{4}-[A-Z0-9]{6}$/, 'Invalid ticket code format'),
  }),
});

export const listTicketsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    gameSession: z.string().optional(),
    search: z.string().optional(),
    orderId: z.string().cuid().optional(),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    maxScanCount: z.number().int().min(1).max(10).optional(),
    scanWindowDays: z.number().int().min(1).max(365).optional(),
    validityDays: z.number().int().min(1).max(365).optional(),
    basePrice: z.number().positive().optional(),
    allowRefunds: z.boolean().optional(),
    allowTransfers: z.boolean().optional(),
    enableCategories: z.boolean().optional(),
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>['body'];
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>['body'];
export type ScanTicketInput = z.infer<typeof scanTicketSchema>['body'];
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>['body'];
export type ListTicketsInput = z.infer<typeof listTicketsSchema>['query'];
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];