// src/modules/settings/settings.controller.ts
import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { asyncHandler } from '../../middleware/errorHandler';

const settingsService = new SettingsService();

export const getSystemSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.getSystemSettings();
  res.json(settings);
});

export const updateSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSystemSettings(req.body);
  res.json(settings);
});