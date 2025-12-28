// src/middleware/validate.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';


export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  // ✅ 1. HTML/XSS protection
  let cleaned = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  // ✅ 2. Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // ✅ 3. Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // ✅ 4. Prevent LDAP injection
  const ldapChars = ['*', '(', ')', '\\', '\0'];
  for (const char of ldapChars) {
    cleaned = cleaned.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }
  
  return cleaned;
};

export const sanitizeMongoOperators = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Remove MongoDB operators
    return obj.replace(/^\$/, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoOperators);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // ✅ Remove $ operators from keys
      const sanitizedKey = key.replace(/^\$/, '');
      
      // ✅ Prevent prototype pollution
      if (['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizeMongoOperators(value);
    }
    
    return sanitized;
  }
  
  return obj;
};

export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // ✅ Sanitize key
      const sanitizedKey = sanitizeString(key);
      
      // ✅ Prevent prototype pollution
      if (['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        logger.warn('Prototype pollution attempt detected', { key });
        continue;
      }
      
      // ✅ Recursively sanitize value
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    
    return sanitized;
  }
  
  return obj;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(sanitizeMongoOperators(req.body));
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(sanitizeMongoOperators(req.query));
  }
  
  next();
};

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      logger.warn('Validation error', {
        path: req.path,
        errors: error.errors,
      });
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors,
      });
    }
  };
};

export const createCustomerSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long'),
    
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long'),
    
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long'),
    
    phone: z.string()
      .min(10, 'Phone number too short')
      .max(20, 'Phone number too long'),
    
    whatsapp: z.string()
      .min(10)
      .max(20)
      .optional(),
    
    location: z.string()
      .min(1, 'Location required')
      .max(200, 'Location too long'),
    
    notes: z.string()
      .max(2000, 'Notes too long')
      .optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long')
      .optional(),
    
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long')
      .optional(),
    
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long')
      .optional(),
    
    phone: z.string()
      .min(10, 'Phone number too short')
      .max(20, 'Phone number too long')
      .optional(),
    
    whatsapp: z.string()
      .min(10)
      .max(20)
      .optional()
      .nullable(),
    
    location: z.string()
      .min(1, 'Location required')
      .max(200, 'Location too long')
      .optional(),
    
    notes: z.string()
      .max(2000, 'Notes too long')
      .optional()
      .nullable(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid customer ID'),
  }),
});

export const customerStatusChangeSchema = z.object({
  body: z.object({
    reason: z.string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason too long'),
  }),
  params: z.object({
    id: z.string().cuid('Invalid customer ID'),
  }),
});

export const scanTicketSchema = z.object({
  body: z.object({
    location: z.string()
      .max(200, 'Location too long')
      .optional(),
    notes: z.string()
      .max(500, 'Notes too long')
      .optional(),
  }),
});

export const cancelTicketSchema = z.object({
  body: z.object({
    reason: z.string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason too long'),
  }),
  params: z.object({
    id: z.string().cuid('Invalid ticket ID'),
  }),
});

export const bulkCancelTicketsSchema = z.object({
  body: z.object({
    ticketIds: z.array(z.string().cuid())
      .min(1, 'At least one ticket ID required')
      .max(100, 'Cannot cancel more than 100 tickets at once'),
    reason: z.string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason too long'),
  }),
});

export const extendTicketSchema = z.object({
  body: z.object({
    days: z.number()
      .int()
      .min(1, 'Days must be at least 1')
      .max(365, 'Cannot extend more than 365 days'),
    reason: z.string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason too long'),
  }),
  params: z.object({
    id: z.string().cuid('Invalid ticket ID'),
  }),
});

export const updateTicketNotesSchema = z.object({
  body: z.object({
    notes: z.string()
      .max(2000, 'Notes too long'),
  }),
  params: z.object({
    id: z.string().cuid('Invalid ticket ID'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long'),
    password: z.string()
      .min(1, 'Password required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long'),
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string()
      .min(1, 'Current password required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Token required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email')
      .max(255, 'Email too long'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long'),
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long'),
    role: z.enum(['ADMIN', 'SUPER_ADMIN', 'STAFF']),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long')
      .optional(),
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long')
      .optional(),
    role: z.enum(['ADMIN', 'SUPER_ADMIN', 'STAFF'])
      .optional(),
  }),
  params: z.object({
    id: z.string().cuid('Invalid user ID'),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().cuid('Invalid customer ID'),
    quantity: z.number()
      .int()
      .min(1, 'Quantity must be at least 1')
      .max(100, 'Cannot order more than 100 tickets at once'),
    gameSession: z.string()
      .max(200, 'Game session description too long')
      .optional(),
  }),
});

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Name required')
      .max(100, 'Name too long'),
    subject: z.string()
      .min(1, 'Subject required')
      .max(200, 'Subject too long'),
    content: z.string()
      .min(10, 'Content too short')
      .max(50000, 'Content too long'),
    targetAudience: z.string()
      .max(500, 'Target audience description too long')
      .optional(),
    scheduledFor: z.string()
      .datetime()
      .optional(),
  }),
});

export const schemas = {
  // Customer
  createCustomer: createCustomerSchema,
  updateCustomer: updateCustomerSchema,
  customerStatusChange: customerStatusChangeSchema,
  
  // Ticket
  scanTicket: scanTicketSchema,
  cancelTicket: cancelTicketSchema,
  bulkCancelTickets: bulkCancelTicketsSchema,
  extendTicket: extendTicketSchema,
  updateTicketNotes: updateTicketNotesSchema,
  
  // Auth
  login: loginSchema,
  register: registerSchema,
  changePassword: changePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  
  // User
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  
  // Order
  createOrder: createOrderSchema,
  
  // Campaign
  createCampaign: createCampaignSchema,
};