// src/utils/ticket.utils.ts
import QRCode from 'qrcode';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger';

const ENCRYPTION_KEY = Buffer.from(process.env.QR_ENCRYPTION_KEY!, 'hex');
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Generate unique ticket code: JGPNR-YYYY-XXXXXX
 */
export const generateTicketCode = (): string => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `JGPNR-${year}-${random}`;
};

/**
 * Encrypt ticket data for QR code
 */
export const encryptTicketData = (data: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt ticket data from QR code
 */
export const decryptTicketData = (encryptedData: string): string => {
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generate QR code and save to file
 */
export const generateQRCode = async (
  ticketCode: string,
  ticketData: any
): Promise<string> => {
  try {
    const qrDir = process.env.QR_CODE_DIR || './uploads/qrcodes';
    await fs.mkdir(qrDir, { recursive: true });

    // Prepare data for QR
    const dataString = JSON.stringify({
      code: ticketCode,
      orderId: ticketData.orderId,
      customerId: ticketData.customerId,
      gameSession: ticketData.gameSession,
      validUntil: ticketData.validUntil,
      timestamp: Date.now(),
    });

    // Encrypt data
    const encrypted = encryptTicketData(dataString);

    // Generate QR code
    const filename = `${ticketCode}.png`;
    const filepath = path.join(qrDir, filename);

    await QRCode.toFile(filepath, encrypted, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    } as any);

    logger.info(`QR code generated: ${filename}`);
    return filepath;
  } catch (error) {
    logger.error('QR code generation failed:', error);
    throw error;
  }
};

/**
 * Validate ticket code format
 */
export const isValidTicketCodeFormat = (code: string): boolean => {
  const regex = /^JGPNR-\d{4}-[A-Z0-9]{6}$/;
  return regex.test(code);
};

/**
 * Calculate days between two dates
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Check if ticket is expired
 */
export const isTicketExpired = (validUntil: Date): boolean => {
  return new Date() > validUntil;
};