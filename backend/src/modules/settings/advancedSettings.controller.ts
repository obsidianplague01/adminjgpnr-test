import { Request, Response } from 'express';
import { AdvancedSettingsService } from './advancedSettings.service';
import { asyncHandler } from '../../middleware/errorHandler';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { UserRole } from '@prisma/client';

const settingsService = new AdvancedSettingsService();

export const getAllSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.getAllSettings();
  res.json(settings);
});

export const updateRegionalSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateRegionalSettings(req.body);
  res.json(settings);
});

export const updateOperatingHours = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateOperatingHours(req.body);
  res.json(settings);
});

export const updateEmailFooter = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateEmailFooter(req.body);
  res.json(settings);
});

export const updatePaymentGateway = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updatePaymentGateway(req.body);
  res.json(settings);
});

export const updateTransactionSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateTransactionSettings(req.body);
  res.json(settings);
});

export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateNotificationPreferences(req.body);
  res.json(settings);
});

export const getLoginActivities = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const activities = await settingsService.getLoginActivities(userId, limit);
  res.json(activities);
});

export const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const sessions = await settingsService.getActiveSessions(userId);
  res.json(sessions);
});


export const terminateSession = asyncHandler(async (req: Request, res: Response) => {
  const targetSession = await prisma.activeSession.findUnique({
    where: { id: req.params.sessionId }
  });
  
  if (!targetSession) {
    throw new AppError(404, 'Session not found');
  }
  
  const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
  const isOwnSession = targetSession.userId === req.user?.userId;
  
  if (!isSuperAdmin && !isOwnSession) {
    throw new AppError(403, 'Cannot terminate another user\'s session');
  }
  
  const result = await settingsService.terminateSession(
    req.params.sessionId,
    targetSession.userId
  );
  
  res.json(result);
});
export const terminateAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const exceptCurrent = req.query.exceptCurrent === 'true';
  const currentSessionId = req.body.currentSessionId;
  
  const result = await settingsService.terminateAllSessions(
    req.user!.userId,
    exceptCurrent ? currentSessionId : undefined
  );
  res.json(result);
});