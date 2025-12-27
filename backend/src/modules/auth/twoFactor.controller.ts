import { Request, Response } from 'express';
import { TwoFactorService } from './twoFactor.service';
import { asyncHandler } from '../../middleware/errorHandler';

const twoFactorService = new TwoFactorService();

export const generateSecret = asyncHandler(async (req: Request, res: Response) => {
  const result = await twoFactorService.generateSecret(req.user!.userId);
  res.json(result);
});

export const enableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const result = await twoFactorService.enableTwoFactor(req.user!.userId, req.body.token);
  res.json(result);
});

export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  const result = await twoFactorService.verifyToken(
    req.user!.userId,
    req.body.token,
    req.body.isBackupCode
  );
  res.json({ valid: result });
});

export const disableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const result = await twoFactorService.disableTwoFactor(req.user!.userId, req.body.password);
  res.json(result);
});

export const regenerateBackupCodes = asyncHandler(async (req: Request, res: Response) => {
  const result = await twoFactorService.regenerateBackupCodes(req.user!.userId, req.body.password);
  res.json(result);
});