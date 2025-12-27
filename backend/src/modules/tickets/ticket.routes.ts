// src/modules/tickets/ticket.routes.ts
import { Router } from 'express';
import * as ticketController from './ticket.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireAdmin, requireStaff } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import {
  createTicketSchema,
  updateTicketSchema,
  scanTicketSchema,
  validateTicketSchema,
  listTicketsSchema,
  updateSettingsSchema,
} from './ticket.schema';

const router = Router();

// All ticket routes require authentication
router.use(authenticateJWT);

// List & search tickets
router.get(
  '/',
  validate(listTicketsSchema),
  ticketController.listTickets
);

// Get ticket stats
router.get('/stats', ticketController.getTicketStats);

// Active tickets
router.get('/active', ticketController.listTickets);

// Scanned tickets
router.get('/scanned', ticketController.listTickets);

// Get single ticket
router.get('/:id', ticketController.getTicket);

// Get ticket by code
router.get('/code/:code', ticketController.getTicketByCode);

// Create tickets (Admin+)
router.post(
  '/',
  requireAdmin,
  validate(createTicketSchema),
  auditLog('CREATE_TICKETS', 'TICKET'),
  ticketController.createTickets
);

// Update ticket (Admin+)
router.patch(
  '/:id',
  requireAdmin,
  validate(updateTicketSchema),
  auditLog('UPDATE_TICKET', 'TICKET'),
  ticketController.updateTicket
);

// Cancel ticket (Admin+)
router.delete(
  '/:id',
  requireAdmin,
  auditLog('CANCEL_TICKET', 'TICKET'),
  ticketController.cancelTicket
);

// Validate ticket (All staff)
router.post(
  '/validate',
  requireStaff,
  validate(validateTicketSchema),
  ticketController.validateTicket
);

// Scan ticket (All staff) - CRITICAL ENDPOINT
router.post(
  '/scan',
  requireStaff,
  validate(scanTicketSchema),
  auditLog('SCAN_TICKET', 'TICKET'),
  ticketController.scanTicket
);

// Scan history
router.get(
  '/scans/history',
  requireStaff,
  ticketController.getScanHistory
);

// Ticket settings
router.get('/settings/config', requireAdmin, ticketController.getSettings);

router.patch(
  '/settings/config',
  requireAdmin,
  validate(updateSettingsSchema),
  auditLog('UPDATE_TICKET_SETTINGS', 'SETTINGS'),
  ticketController.updateSettings
);

export default router;