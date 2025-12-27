import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
} from './customer.schema';

const customerService = new CustomerService();

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateCustomerInput = req.body;
  const customer = await customerService.createCustomer(data);
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
  const customer = await customerService.updateCustomer(id, data);
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await customerService.deleteCustomer(id);
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

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const result = await customerService.uploadDocument(id, req.file);
  res.json(result);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await customerService.deleteDocument(id);
  res.json(result);
});

export const downloadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const document = await customerService.getDocument(id);
  
  res.download(document.path, document.name || 'document');
});