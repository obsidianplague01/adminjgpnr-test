// src/utils/qrCodeGenerator.ts
import QRCode from 'qrcode';

export interface TicketQRData {
  ticketCode: string;
  orderNumber: string;
  customerName: string;
  gameSession: string;
  validUntil: string;
}

export const generateQRCode = async (data: TicketQRData): Promise<string> => {
  try {
    const qrData = JSON.stringify({
      code: data.ticketCode,
      order: data.orderNumber,
      customer: data.customerName,
      session: data.gameSession,
      valid: data.validUntil,
      timestamp: new Date().toISOString(),
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeFromTicketCode = async (ticketCode: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(ticketCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const downloadQRCode = (dataURL: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};