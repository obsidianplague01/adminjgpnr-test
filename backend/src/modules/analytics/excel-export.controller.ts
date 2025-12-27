import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { excelExportService } from './excel-export.service';
import { logger } from '../../utils/logger';

export const exportAnalyticsExcel = asyncHandler(async (req: Request, res: Response) => {
  const includeCharts = req.query.includeCharts === 'true';
  
  let dateRange: { start: Date; end: Date } | undefined;
  if (req.query.startDate && req.query.endDate) {
    dateRange = {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    };
  }

  logger.info('Generating Excel analytics report', {
    includeCharts,
    dateRange
  });

  const buffer = await excelExportService.generateAnalyticsReport({
    includeCharts,
    dateRange
  });

  const filename = `JGPNR_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);

  res.send(buffer);
});