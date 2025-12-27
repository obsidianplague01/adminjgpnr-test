// src/modules/customers/customer.schema.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name required').max(50).trim(),
    lastName: z.string().min(1, 'Last name required').max(50).trim(),
    email: z.string().email('Invalid email format').toLowerCase().trim(),
    phone: z.string().min(1, 'Phone required').max(20).trim(),
    whatsapp: z.string().max(20).optional(),
    location: z.string().min(1, 'Location required').max(200).trim(),
    notes: z.string().max(1000).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).trim().optional(),
    lastName: z.string().min(1).max(50).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    phone: z.string().min(1).max(20).trim().optional(),
    whatsapp: z.string().max(20).optional(),
    location: z.string().min(1).max(200).trim().optional(),
    notes: z.string().max(1000).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid customer ID'),
  }),
});

export const listCustomersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type ListCustomersInput = z.infer<typeof listCustomersSchema>['query'];