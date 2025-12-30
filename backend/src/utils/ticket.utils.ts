// src/utils/ticket.utils.ts
import QRCode from 'qrcode';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';


if (!process.env.QR_ENCRYPTION_KEY) {
  throw new Error('QR_ENCRYPTION_KEY is required');
}
const validateEncryptionKey = () => {
  const key = process.env.QR_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('QR_ENCRYPTION_KEY must be 64 character hex');
  }
  const uniqueChars = new Set(key.toLowerCase().split('')).size;
  if (uniqueChars < 14) {
    throw new Error('QR_ENCRYPTION_KEY has insufficient entropy (min 14 unique chars)');
  }
  const charFreq = new Map<string, number>();
  for (const char of key.toLowerCase()) {
    charFreq.set(char, (charFreq.get(char) || 0) + 1);
  }
  
  let entropy = 0;
  for (const count of charFreq.values()) {
    const p = count / key.length;
    entropy -= p * Math.log2(p);
  }
  if (entropy < 3.5) {
    throw new Error(`QR_ENCRYPTION_KEY entropy too low: ${entropy.toFixed(2)} (min 3.5)`);
  }
  
  const sequential = ['0123456789abcdef'.repeat(4), 'fedcba9876543210'.repeat(4)];
  if (sequential.some(s => key.toLowerCase().includes(s.substring(0, 16)))) {
    throw new Error('QR_ENCRYPTION_KEY contains predictable patterns');
  }
};

validateEncryptionKey();


const IV_LENGTH = 16;
const ENCRYPTION_KEY = Buffer.from(process.env.QR_ENCRYPTION_KEY!, 'hex');
const ALGORITHM = 'aes-256-cbc';



export const generateTicketCode = (): string => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `JGPNR-${year}-${random}`;
};

export const encryptTicketData = (data: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt ticket data');
  }
};

export const decryptTicketData = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt ticket data');
  }
};

export const generateQRCode = async (
  ticketCode: string,
  ticketData: any
): Promise<string> => {
  try {
    const dataString = JSON.stringify({
      code: ticketCode,
      orderId: ticketData.orderId,
      customerId: ticketData.customerId,
      gameSession: ticketData.gameSession,
      validUntil: ticketData.validUntil,
      timestamp: Date.now(),
    });

    const encrypted = encryptTicketData(dataString);

    // Ensure QR code directory exists
    const qrDir = process.env.QR_CODE_DIR || './uploads/qrcodes';
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

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
    });

    logger.info(`QR code generated: ${ticketCode}`);
    
    // Return relative path for database storage
    return `/uploads/qrcodes/${filename}`;
  } catch (error) {
    logger.error('QR code generation failed:', error);
    throw new Error(`Failed to generate QR code for ticket ${ticketCode}`);
  }
};

export const isValidTicketCodeFormat = (code: string): boolean => {
  const regex = /^JGPNR-\d{4}-[A-Z0-9]{6}$/;
  return regex.test(code);
};

export const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isTicketExpired = (validUntil: Date): boolean => {
  return new Date() > validUntil;
};