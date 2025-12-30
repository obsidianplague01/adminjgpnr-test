// src/modules/orders/order.controller.ts
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { AppError } from '../../middleware/errorHandler';
import { RefundOrderInput } from './order.schema';

const orderService = new OrderService();


export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(
    req.body,
    req.ip,
    req.user?.userId
  );
  
  res.status(201).json({
    message: 'Order created successfully',
    order
  });
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
  const order = await orderService.updateOrder(
    req.params.id,
    req.body,
    req.user?.userId,
    req.ip
  );
  
  res.json({
    message: 'Order updated successfully',
    order
  });
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.confirmPayment(
    req.params.id,
    req.body,
    req.user?.userId,
    req.ip
  );
  
  res.json({
    message: 'Payment confirmed successfully',
    order
  });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  
  const result = await orderService.cancelOrder(
    req.params.id,
    reason,
    req.user?.userId,
    req.ip
  );
  
  res.json(result);
});

export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await orderService.getOrderStats(
    req.query.startDate as string,
    req.query.endDate as string
  );
  
  res.json(stats);
});

export const getCustomerOrders = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const orders = await orderService.getCustomerOrders(customerId, limit);
  
  res.json({
    customerId,
    total: orders.length,
    orders
  });
});

export const resendConfirmation = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.resendConfirmation(
    req.params.id,
    req.user?.userId,
    req.ip
  );
  
  res.json(result);
});

export const downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrder(req.params.id);
  
  res.json({
    message: 'Receipt generation not yet implemented',
    order
  });
});


export const downloadTickets = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrder(req.params.id);
  
  if (order.status !== 'COMPLETED') {
    throw new AppError(400, 'Cannot download tickets for incomplete orders');
  }
  
  // TODO: Implement ZIP generation with QR codes
  // For now, return ticket details
  res.json({
    message: 'Ticket download not yet implemented',
    tickets: order.tickets
  });
});

export const getOrderTimeline = asyncHandler(async (req: Request, res: Response) => {
  
  const order = await orderService.getOrder(req.params.id);
  
  const timeline = [
    {
      event: 'ORDER_CREATED',
      timestamp: order.purchaseDate,
      description: 'Order was created'
    },
    order.paidAt && {
      event: 'PAYMENT_CONFIRMED',
      timestamp: order.paidAt,
      description: 'Payment was confirmed'
    },
    order.status === 'CANCELLED' && {
      event: 'ORDER_CANCELLED',
      timestamp: order.updatedAt,
      description: 'Order was cancelled'
    }
  ].filter(Boolean);
  
  res.json({ timeline });
});

export const bulkCreateOrders = asyncHandler(async (req: Request, res: Response) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new AppError(400, 'Orders array is required');
  }
  
  if (orders.length > 50) {
    throw new AppError(400, 'Maximum 50 orders can be created at once');
  }
  
  const results = await Promise.allSettled(
    orders.map((orderData: any) =>
      orderService.createOrder(orderData, req.ip, req.user?.userId)
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  res.json({
    message: `Bulk order creation completed`,
    summary: {
      total: orders.length,
      successful,
      failed
    },
    results: results.map((result, index) => ({
      index,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }))
  });
});

export const exportOrdersCSV = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.listOrders({
    ...req.query,
    limit: 10000 // Get all orders for export
  });
  
  // Create CSV
  const csvHeader = 'Order Number,Customer Name,Email,Quantity,Amount,Status,Purchase Date,Paid At\n';
  const csvRows = result.orders.map(order => {
    return [
      order.orderNumber,
      `${order.customer.firstName} ${order.customer.lastName}`,
      order.customer.email,
      order.quantity,
      order.amount,
      order.status,
      order.purchaseDate.toISOString(),
      order.paidAt?.toISOString() || 'N/A'
    ].join(',');
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
  res.send(csv);
});

export const getRevenueBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  const stats = await orderService.getOrderStats(
    startDate as string,
    endDate as string
  );
  
  res.json({
    period: { startDate, endDate },
    groupBy,
    revenue: stats.revenue,
    orders: stats.completed,

  });
});

export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: RefundOrderInput = req.body;
  
  if (!req.user) {
    throw new AppError(401, 'Authentication required');
  }
  
  const result = await orderService.refundOrder(
    id,
    data,
    req.user.userId,
    req.ip
  );
  
  res.json(result);
});


export const markAsFraud = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  
  
  await orderService.cancelOrder(
    req.params.id,
    `Marked as fraudulent: ${reason}`,
    req.user?.userId,
    req.ip
  );
  
  // TODO: Add customer to fraud watchlist
  
  res.json({
    message: 'Order marked as fraudulent and cancelled'
  });
});
