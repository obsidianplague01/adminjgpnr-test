// src/modules/payment/payment.controller.ts
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { asyncHandler } from '../../middleware/errorHandler';

const paymentService = new PaymentService();

export const initializePayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.initializePayment(req.params.orderId);
  res.json(result);
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.verifyPayment(req.params.reference);
  res.json(result);
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const result = await paymentService.handleWebhook(req.body, signature);
  res.json(result);
});