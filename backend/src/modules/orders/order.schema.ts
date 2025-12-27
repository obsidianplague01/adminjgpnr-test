// src/modules/orders/order.schema.ts
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().cuid('Invalid customer ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Maximum 50 tickets per order'),
    gameSession: z.string().min(1, 'Game session required').max(100),
    amount: z.number().positive('Amount must be positive'),
    purchaseDate: z.string().datetime().optional(),
  }),
});

export const updateOrderSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    quantity: z.number().int().min(1).max(50).optional(),
    amount: z.number().positive().optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid order ID'),
  }),
});

export const confirmPaymentSchema = z.object({
  body: z.object({
    paymentReference: z.string().min(1, 'Payment reference required'),
    paymentMethod: z.string().optional(),
    paidAmount: z.number().positive().optional(),
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
    search: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>['body'];
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>['body'];
export type ListOrdersInput = z.infer<typeof listOrdersSchema>['query'];