// src/modules/orders/order.schema.ts
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().cuid('Invalid customer ID'),
    quantity: z.number().int().min(1).max(100),
    amount: z.number().positive(),
    gameSession: z.string().min(1).max(200).optional(),
    purchaseDate: z.string().datetime().optional(),
  }),
});

export const updateOrderSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    amount: z.number().positive().optional(),
    quantity: z.number().int().min(1).max(100).optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid order ID'),
  }),
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentReference: z.string().min(1),
    paidAmount: z.number().positive(),
    paymentMethod: z.enum(['card', 'bank_transfer', 'ussd', 'cash']),
  }),
  params: z.object({
    id: z.string().cuid('Invalid order ID'),
  }),
});

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    customerId: z.string().cuid().optional(),
    search: z.string().max(100).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(10).max(500).optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid order ID'),
  }),
});

export const bulkCreateOrdersSchema = z.object({
  body: z.object({
    orders: z.array(
      z.object({
        customerId: z.string().cuid(),
        quantity: z.number().int().min(1).max(100),
        amount: z.number().positive(),
        gameSession: z.string().min(1).max(200).optional(),
      })
    ).min(1).max(50),
  }),
});

// Type exports
export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>['body'];
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>['body'];
export type ListOrdersInput = z.infer<typeof listOrdersSchema>['query'];
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>['body'];
export type BulkCreateOrdersInput = z.infer<typeof bulkCreateOrdersSchema>['body'];