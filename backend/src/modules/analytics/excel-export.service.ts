import ExcelJS from 'exceljs';
import { viewService } from '../../utils/materialized-views.service';


export interface ExportOptions {
  includeCharts?: boolean;
  dateRange?: { start: Date; end: Date };
}

export class ExcelExportService {
  async generateAnalyticsReport(options: ExportOptions = {}): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'JGPNR Analytics';
    workbook.created = new Date();
    workbook.modified = new Date();

    await this.addRevenueSheet(workbook, options);
    await this.addTicketsSheet(workbook);
    await this.addCustomersSheet(workbook);
    await this.addSessionsSheet(workbook);
    await this.addScansSheet(workbook, options);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async addRevenueSheet(workbook: ExcelJS.Workbook, _options: ExportOptions) {
    const sheet = workbook.addWorksheet('Revenue Analysis', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });

    const monthlyData = await viewService.getMonthlyRevenue(12);

    sheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15, style: { numFmt: '₦#,##0.00' } },
      { header: 'Orders', key: 'orders', width: 12 },
      { header: 'Avg Order Value', key: 'avg', width: 15, style: { numFmt: '₦#,##0.00' } },
      { header: 'Tickets Sold', key: 'tickets', width: 12 },
      { header: 'Customers', key: 'customers', width: 12 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    monthlyData.forEach(row => {
      sheet.addRow({
        month: row.month,
        revenue: row.revenue,
        orders: row.orderCount,
        avg: row.avgOrderValue,
        tickets: row.ticketsSold,
        customers: row.uniqueCustomers
      });
    });

    const totalRow = sheet.addRow({
      month: 'TOTAL',
      revenue: { formula: `SUM(B2:B${sheet.rowCount})` },
      orders: { formula: `SUM(C2:C${sheet.rowCount})` },
      avg: { formula: `AVERAGE(D2:D${sheet.rowCount})` },
      tickets: { formula: `SUM(E2:E${sheet.rowCount})` },
      customers: { formula: `SUM(F2:F${sheet.rowCount})` }
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  private async addTicketsSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet('Ticket Analysis', {
      properties: { tabColor: { argb: 'FF2196F3' } }
    });

    const sessionData = await viewService.getSessionPerformance();

    sheet.columns = [
      { header: 'Game Session', key: 'session', width: 25 },
      { header: 'Total Tickets', key: 'total', width: 15 },
      { header: 'Scanned', key: 'scanned', width: 12 },
      { header: 'Scan Rate %', key: 'rate', width: 12, style: { numFmt: '0.00%' } },
      { header: 'Revenue', key: 'revenue', width: 15, style: { numFmt: '₦#,##0.00' } },
      { header: 'Avg Revenue/Ticket', key: 'avg', width: 18, style: { numFmt: '₦#,##0.00' } }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };

    sessionData.forEach(row => {
      sheet.addRow({
        session: row.gameSession,
        total: row.totalTickets,
        scanned: row.scannedTickets,
        rate: row.scanRate / 100,
        revenue: row.totalRevenue,
        avg: row.avgRevenuePerTicket
      });
    });

    sheet.addConditionalFormatting({
      ref: `D2:D${sheet.rowCount}`,
      rules: [
        {
          type: 'colorScale',
          priority: 1,
          cfvo: [
            { type: 'num', value: 0 },
            { type: 'num', value: 0.5 },
            { type: 'num', value: 1 }
          ],
          color: [
            { argb: 'FFF44336' },
            { argb: 'FFFFC107' },
            { argb: 'FF4CAF50' }
          ]
        }
      ]
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  private async addCustomersSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet('Customer Segments', {
      properties: { tabColor: { argb: 'FFFF9800' } }
    });

    const segmentData = await viewService.getCustomerSegments();

    sheet.columns = [
      { header: 'Segment', key: 'segment', width: 20 },
      { header: 'Customer Count', key: 'count', width: 15 },
      { header: 'Total Revenue', key: 'revenue', width: 15, style: { numFmt: '₦#,##0.00' } },
      { header: 'Avg Spent', key: 'avg', width: 15, style: { numFmt: '₦#,##0.00' } },
      { header: '% of Total', key: 'percent', width: 12, style: { numFmt: '0.00%' } }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF9800' }
    };

    const totalRevenue = segmentData.reduce((sum, s) => sum + s.totalRevenue, 0);

    segmentData.forEach(row => {
      sheet.addRow({
        segment: this.formatSegmentName(row.segment),
        count: row.count,
        revenue: row.totalRevenue,
        avg: row.avgSpent,
        percent: totalRevenue > 0 ? row.totalRevenue / totalRevenue : 0
      });
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  private async addSessionsSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet('Session Performance');
    
    const sessions = await viewService.getSessionPerformance();
    
    sheet.columns = [
      { header: 'Session', key: 'session', width: 25 },
      { header: 'Total Tickets', key: 'total', width: 15 },
      { header: 'Scanned', key: 'scanned', width: 12 },
      { header: 'Scan Rate', key: 'rate', width: 12, style: { numFmt: '0.00%' } },
      { header: 'Revenue', key: 'revenue', width: 15, style: { numFmt: '₦#,##0.00' } }
    ];
    
    sessions.forEach(s => {
      sheet.addRow({
        session: s.gameSession,
        total: s.totalTickets,
        scanned: s.scannedTickets,
        rate: s.scanRate / 100,
        revenue: s.totalRevenue
      });
    });
  }

  private async addScansSheet(workbook: ExcelJS.Workbook, options: ExportOptions) {
    const sheet = workbook.addWorksheet('Scan Statistics');
    
    const endDate = options.dateRange?.end || new Date();
    const startDate = options.dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const scanData = await viewService.getScanStats(startDate, endDate);
    
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Total Scans', key: 'total', width: 12 },
      { header: 'Allowed', key: 'allowed', width: 12 },
      { header: 'Denied', key: 'denied', width: 12 },
      { header: 'Success Rate', key: 'rate', width: 12, style: { numFmt: '0.00%' } }
    ];
    
    scanData.forEach(s => {
      sheet.addRow({
        date: s.date,
        location: s.location,
        total: s.totalScans,
        allowed: s.allowedScans,
        denied: s.deniedScans,
        rate: s.successRate / 100
      });
    });
  }

  private formatSegmentName(segment: string): string {
    return segment
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const excelExportService = new ExcelExportService();