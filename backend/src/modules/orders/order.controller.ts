// src/modules/orders/order.controller.ts
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { asyncHandler } from '../../middleware/errorHandler';

const orderService = new OrderService();

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.listOrders(req.query);
  res.json(result);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrder(req.params.id);
  res.json(order);
});

export const getOrderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderByNumber(req.params.orderNumber);
  res.json(order);
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateOrder(req.params.id, req.body);
  res.json(order);
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.confirmPayment(req.params.id, req.body);
  res.json(order);
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.cancelOrder(req.params.id);
  res.json(result);
});

export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await orderService.getOrderStats(
    req.query.startDate as string,
    req.query.endDate as string
  );
  res.json(stats);
});