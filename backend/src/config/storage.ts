import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Storage configuration for local file system
 */
export const STORAGE_CONFIG = {
  uploads: process.env.UPLOADS_DIR || './uploads',
  qrcodes: process.env.QR_CODE_DIR || './uploads/qrcodes',
  tickets: process.env.PDF_DIR || './uploads/tickets',
  customerDocuments: './uploads/customer-documents',
  temp: './uploads/temp',
};

/**
 * Initialize storage directories
 */
export const initializeStorage = (): void => {
  Object.entries(STORAGE_CONFIG).forEach(([key, directory]) => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      logger.info(`Created storage directory: ${directory} (${key})`);
    }
  });

  logger.info('Local file storage initialized');
};

/**
 * Get public URL for uploaded file
 */
export const getFileUrl = (relativePath: string): string => {
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}${relativePath}`;
};

/**
 * Delete file from local storage
 */
export const deleteFile = (relativePath: string): boolean => {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info(`File deleted: ${relativePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to delete file: ${relativePath}`, error);
    return false;
  }
};

/**
 * Check if file exists
 */
export const fileExists = (relativePath: string): boolean => {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.existsSync(fullPath);
};

/**
 * Get file size in bytes
 */
export const getFileSize = (relativePath: string): number => {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    const stats = fs.statSync(fullPath);
    return stats.size;
  } catch (error) {
    logger.error(`Failed to get file size: ${relativePath}`, error);
    return 0;
  }
};

/**
 * Clean up old temporary files (older than 24 hours)
 */
export const cleanupTempFiles = (): void => {
  try {
    const tempDir = STORAGE_CONFIG.temp;
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temp file: ${file}`);
      }
    });
  } catch (error) {
    logger.error('Failed to clean up temp files:', error);
  }
};