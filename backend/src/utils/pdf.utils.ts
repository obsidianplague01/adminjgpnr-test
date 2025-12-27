// src/utils/pdf.utils.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface TicketPDFData {
  ticketCode: string;
  orderNumber: string;
  customerName: string;
  gameSession: string;
  validUntil: Date;
  qrCodePath: string;
}

export const generateTicketPDF = async (
  ticketData: TicketPDFData
): Promise<string> => {
  const pdfDir = process.env.PDF_DIR || './uploads/tickets';
  await fs.promises.mkdir(pdfDir, { recursive: true });

  const filename = `${ticketData.ticketCode}.pdf`;
  const filepath = path.join(pdfDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A5',
      margin: 50,
    });

    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('JGPNR PAINTBALL', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(14)
      .font('Helvetica')
      .text('ENTRY TICKET', { align: 'center' })
      .moveDown(1.5);

    // Ticket details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Ticket Code:', { continued: true })
      .font('Helvetica')
      .text(` ${ticketData.ticketCode}`)
      .moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Order Number:', { continued: true })
      .font('Helvetica')
      .text(` ${ticketData.orderNumber}`)
      .moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Customer:', { continued: true })
      .font('Helvetica')
      .text(` ${ticketData.customerName}`)
      .moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Session:', { continued: true })
      .font('Helvetica')
      .text(` ${ticketData.gameSession}`)
      .moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Valid Until:', { continued: true })
      .font('Helvetica')
      .text(` ${ticketData.validUntil.toLocaleDateString()}`)
      .moveDown(2);

    // QR Code
    if (fs.existsSync(ticketData.qrCodePath)) {
      doc.text('Scan QR Code at Entry:', { align: 'center' });
      doc.moveDown(0.5);
      
      const qrX = (doc.page.width - 200) / 2;
      doc.image(ticketData.qrCodePath, qrX, doc.y, {
        width: 200,
        height: 200,
        align: 'center',
      });
      doc.moveDown(10);
    }

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Terms & Conditions:', { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(8)
      .text('• This ticket is valid for 2 scans within 14 days', { align: 'center' })
      .text('• Non-transferable and non-refundable', { align: 'center' })
      .text('• Must be presented at entry', { align: 'center' })
      .moveDown(1);

    doc
      .fontSize(9)
      .text('Contact: info@jgpnr.com | +234-XXX-XXX-XXXX', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      logger.info(`PDF generated: ${filename}`);
      resolve(filepath);
    });

    stream.on('error', reject);
  });
};



