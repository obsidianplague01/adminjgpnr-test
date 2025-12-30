// src/modules/tickets/ticket.controller.ts
import { Request, Response } from 'express';
import { TicketService } from './ticket.service';
import { asyncHandler } from '../../middleware/errorHandler';

import { extractAuditContext } from '../../middleware/audit';
const ticketService = new TicketService();


export const createTickets = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const tickets = await ticketService.createTickets(req.body, context);
  res.status(201).json({ tickets, count: tickets.length });
});

export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const ticket = await ticketService.updateTicket(req.params.id, req.body, context);
  res.json(ticket);
});

export const cancelTicket = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const { reason } = req.body;
  const ticket = await ticketService.cancelTicket(req.params.id, reason, context);
  res.json(ticket);
});

export const scanTicket = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const result = await ticketService.scanTicket(req.body, context);
  res.json(result);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const context = extractAuditContext(req);
  const settings = await ticketService.updateSettings(req.body, context);
  res.json(settings);
});
export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const result = await ticketService.listTickets(req.query);
  res.json(result);
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicket(req.params.id);
  res.json(ticket);
});

export const getTicketByCode = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicketByCode(req.params.code);
  res.json(ticket);
});

export const validateTicket = asyncHandler(async (req: Request, res: Response) => {
  const result = await ticketService.validateTicket(req.body);
  res.json(result);
});


export const getScanHistory = asyncHandler(async (req: Request, res: Response) => {
  const scans = await ticketService.getScanHistory({
    ticketId: req.query.ticketId as string,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  });
  res.json(scans);
});

export const getTicketStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await ticketService.getTicketStats();
  res.json(stats);
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await ticketService.getSettings();
  res.json(settings);
});
