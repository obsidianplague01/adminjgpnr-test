// src/modules/email/email.controller.ts
import { Request, Response } from 'express';
import { EmailService } from './email.service';
import { asyncHandler } from '../../middleware/errorHandler';

const emailService = new EmailService();

// Templates
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await emailService.createTemplate(req.body);
  res.status(201).json(template);
});

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await emailService.listTemplates(page, limit);
  res.json(result);
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await emailService.getTemplate(req.params.id);
  res.json(template);
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await emailService.updateTemplate(req.params.id, req.body);
  res.json(template);
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.deleteTemplate(req.params.id);
  res.json(result);
});

// Email sending
export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.sendSingleEmail(req.body);
  res.json(result);
});

export const testSMTP = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.testSMTP(req.body.email);
  res.json(result);
});

// Campaigns
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await emailService.createCampaign(req.body);
  res.status(201).json(campaign);
});

export const listCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await emailService.listCampaigns(page, limit);
  res.json(result);
});

export const sendCampaign = asyncHandler(async (req: Request, res: Response) => {
  const result = await emailService.sendCampaign(req.params.id);
  res.json(result);
});

