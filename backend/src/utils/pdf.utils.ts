import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export interface TicketPDFData {
  ticketCode: string;
  orderNumber: string;
  customerName: string;
  gameSession: string;
  validUntil: Date;
  qrCodePath: string;
}

/**
 * Generate ticket PDF and save to local storage
 */
export const generateTicketPDF = async (
  ticketData: TicketPDFData
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure PDF directory exists
      const pdfDir = process.env.PDF_DIR || './uploads/tickets';
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const filename = `${ticketData.ticketCode}.pdf`;
      const filepath = path.join(pdfDir, filename);

      const doc = new PDFDocument({
        size: 'A5',
        margin: 50,
      });

      const writeStream = fs.createWriteStream(filepath);

      doc.pipe(writeStream);

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

      // QR Code (from local file system)
      if (ticketData.qrCodePath) {
        try {
          const qrCodeFullPath = path.join(process.cwd(), ticketData.qrCodePath);
          
          if (fs.existsSync(qrCodeFullPath)) {
            doc.text('Scan QR Code at Entry:', { align: 'center' });
            doc.moveDown(0.5);
            
            const qrX = (doc.page.width - 200) / 2;
            doc.image(qrCodeFullPath, qrX, doc.y, {
              width: 200,
              height: 200,
              align: 'center',
            });
            doc.moveDown(10);
          }
        } catch (error) {
          logger.error('Failed to embed QR code in PDF:', error);
        }
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

      writeStream.on('finish', () => {
        logger.info(`PDF generated: ${ticketData.ticketCode}`);
        // Return relative path for database storage
        resolve(`/uploads/tickets/${filename}`);
      });

      writeStream.on('error', (error) => {
        logger.error('PDF generation failed:', error);
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};