// src/modules/customers/customer.controller.ts 
import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateUploadedFile } from '../../middleware/upload';
import { extractAuditContext } from '../../middleware/audit';
import { UserRole } from '@prisma/client';
import prisma from '../../config/database';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
} from './customer.schema';
import { AppError } from '../../middleware/errorHandler';
import path from 'path';

const customerService = new CustomerService();

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateCustomerInput = req.body;
  const context = extractAuditContext(req);
  const customer = await customerService.createCustomer(data, context);
  res.status(201).json(customer);
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const filters: ListCustomersInput = req.query;
  const result = await customerService.listCustomers(filters);
  res.json(result);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await customerService.getCustomer(id);
  res.json(customer);
});
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: UpdateCustomerInput = req.body;
  const context = extractAuditContext(req);
  const customer = await customerService.updateCustomer(id, data, context);
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  const result = await customerService.deleteCustomer(id, context);
  res.json(result);
});

export const deactivateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const context = extractAuditContext(req);
  const result = await customerService.deactivateCustomer(id, reason, context);
  res.json(result);
});

export const reactivateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const context = extractAuditContext(req);
  const result = await customerService.reactivateCustomer(id, reason, context);
  res.json(result);
});

export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await customerService.getCustomerOrders(id, page, limit);
  res.json(result);
});

export const getCustomerStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await customerService.getCustomerStats();
  res.json(stats);
});

export const getTopCustomers = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const customers = await customerService.getTopCustomers(limit);
  res.json(customers);
});

export const searchCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 10;
  const customers = await customerService.searchCustomers(query, limit);
  res.json(customers);
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const sanitizedName = path.basename(req.file.originalname)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  
  req.file.originalname = sanitizedName;

  const isValid = await validateUploadedFile(req.file.path);
  if (!isValid) {
    res.status(400).json({ error: 'File validation failed' });
    return;
  }

  const context = extractAuditContext(req);
  const result = await customerService.uploadDocument(id, req.file, context);
  res.json(result);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  const result = await customerService.deleteDocument(id, context);
  res.json(result);
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const context = extractAuditContext(req);
  
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }
  
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, documentPath: true, email: true }
  });
  
  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }
  
  const isAdmin = req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN;
  
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true }
    });
    
    if (!user || user.email !== customer.email) {
      throw new AppError(403, 'Access denied - not your document');
    }
  }
  
  const document = await customerService.getDocument(id, context);
  res.download(document.path, document.name || 'document');
});