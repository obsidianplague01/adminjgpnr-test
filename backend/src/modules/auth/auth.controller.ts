// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../middleware/errorHandler';

const authService = new AuthService();

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  res.json(result);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.userId);
  res.json(user);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.createUser(req.body);
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateUser(req.params.id, req.body);
  res.json(user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.changePassword(req.params.id, req.body);
  res.json(result);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const result = await authService.listUsers(page, limit);
  res.json(result);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.params.id);
  res.json(user);
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.deactivateUser(req.params.id);
  res.json(result);
});