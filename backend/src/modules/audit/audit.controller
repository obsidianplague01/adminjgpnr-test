import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuditLogger, AuditEntity, AuditAction } from '../../utils/audit';


export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const {
    userId,
    action,
    entity,
    entityId,
    startDate,
    endDate,
    success,
    limit,
    offset,
  } = req.query;

  const filters: any = {};

  if (userId) filters.userId = userId as string;
  if (action) filters.action = action as AuditAction;
  if (entity) filters.entity = entity as AuditEntity;
  if (entityId) filters.entityId = entityId as string;
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);
  if (success !== undefined) filters.success = success === 'true';
  if (limit) filters.limit = parseInt(limit as string);
  if (offset) filters.offset = parseInt(offset as string);

  const result = await AuditLogger.query(filters);
  
  res.json({
    logs: result.logs,
    total: result.total,
    filters,
  });
});

export const getAuditStats = asyncHandler(async (req: Request, res: Response) => {
  const { userId, startDate, endDate } = req.query;

  const filters: any = {};
  if (userId) filters.userId = userId as string;
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);

  const stats = await AuditLogger.getStats(filters);
  
  res.json(stats);
});

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit } = req.query;

  const activity = await AuditLogger.getUserActivity(
    userId,
    limit ? parseInt(limit as string) : 20
  );
  
  res.json(activity);
});

export const getEntityHistory = asyncHandler(async (req: Request, res: Response) => {
  const { entity, entityId } = req.params;
  const { limit } = req.query;

  const history = await AuditLogger.getEntityHistory(
    entity as AuditEntity,
    entityId,
    limit ? parseInt(limit as string) : 50
  );
  
  res.json(history);
});

export const getSecurityEvents = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, limit } = req.query;

  const filters: any = {};
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);
  if (limit) filters.limit = parseInt(limit as string);

  const events = await AuditLogger.getSecurityEvents(filters);
  
  res.json(events);
});

export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { userId, startDate, endDate } = req.query;

  const filters: any = {};
  if (userId) filters.userId = userId as string;
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);
  filters.limit = 10000; // Max export

  const result = await AuditLogger.query(filters);

  // Log the export
  const context = AuditLogger.getContextFromRequest(req);
  await AuditLogger.logDataExport(
    AuditEntity.SYSTEM,
    'AUDIT_LOGS',
    result.total,
    context,
    { filters }
  );

  // Convert to CSV
  const csv = convertLogsToCSV(result.logs);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
  res.send(csv);
});

function convertLogsToCSV(logs: any[]): string {
  const headers = [
    'Timestamp',
    'User ID',
    'User Email',
    'Action',
    'Entity',
    'Entity ID',
    'IP Address',
    'Success',
    'Error Message',
  ];

  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.userId || '',
    log.user?.email || '',
    log.action,
    log.entity,
    log.entityId || '',
    log.ipAddress || '',
    log.success ? 'Yes' : 'No',
    log.errorMessage || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}