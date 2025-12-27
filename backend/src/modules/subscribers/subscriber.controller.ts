// src/modules/subscribers/subscriber.controller.ts
import { Request, Response } from 'express';
import { SubscriberService } from './subscriber.service';
import { asyncHandler } from '../../middleware/errorHandler';

const subscriberService = new SubscriberService();

export const createSubscriber = asyncHandler(async (req: Request, res: Response) => {
  const subscriber = await subscriberService.createSubscriber(req.body);
  res.status(201).json(subscriber);
});

export const listSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscriberService.listSubscribers(req.query);
  res.json(result);
});

export const getSubscriber = asyncHandler(async (req: Request, res: Response) => {
  const subscriber = await subscriberService.getSubscriber(req.params.id);
  res.json(subscriber);
});

export const updateSubscriber = asyncHandler(async (req: Request, res: Response) => {
  const subscriber = await subscriberService.updateSubscriber(req.params.id, req.body);
  res.json(subscriber);
});

export const deleteSubscriber = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscriberService.deleteSubscriber(req.params.id);
  res.json(result);
});

export const exportSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const csv = await subscriberService.exportSubscribers(req.query.status as string);
  const filename = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const getSubscriberStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await subscriberService.getSubscriberStats();
  res.json(stats);
});

