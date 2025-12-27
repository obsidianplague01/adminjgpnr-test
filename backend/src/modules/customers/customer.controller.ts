// src/modules/customers/customer.controller.ts
import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

const customerService = new CustomerService();

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const result = await customerService.uploadDocument(req.params.id, req.file);
  res.json(result);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.deleteDocument(req.params.id);
  res.json(result);
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await customerService.getDocument(req.params.id);
  res.download(doc.path, doc.name || 'document');
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json(customer);
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.listCustomers(req.query);
  res.json(result);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json(customer);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.deleteCustomer(req.params.id);
  res.json(result);
});

export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const result = await customerService.getCustomerOrders(req.params.id, page, limit);
  res.json(result);
});

export const getCustomerStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await customerService.getCustomerStats();
  res.json(stats);
});
