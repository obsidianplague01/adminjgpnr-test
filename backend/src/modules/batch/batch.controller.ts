// src/modules/batch/batch.controller.ts
import { Request, Response } from 'express';
import { BatchService } from './batch.service';
import { asyncHandler } from '../../middleware/errorHandler';

const batchService = new BatchService();

export const bulkCreateTickets = asyncHandler(async (req: Request, res: Response) => {
  const result = await batchService.bulkCreateTickets(req.body);
  res.json(result);
});

export const bulkCancelTickets = asyncHandler(async (req: Request, res: Response) => {
  const result = await batchService.bulkCancelTickets(req.body.ticketIds);
  res.json(result);
});

export const bulkUpdateSessions = asyncHandler(async (req: Request, res: Response) => {
  const result = await batchService.bulkUpdateSessions(
    req.body.ticketIds,
    req.body.newSession
  );
  res.json(result);
});

export const bulkImportCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await batchService.bulkImportCustomers(req.body.customers);
  res.json(result);
});

export const bulkSendEmails = asyncHandler(async (req: Request, res: Response) => {
  const result = await batchService.bulkSendEmails(req.body);
  res.json(result);
});

