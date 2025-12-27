// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let uploadPath = 'uploads/documents';
    if (file.fieldname === 'avatar') uploadPath = 'uploads/avatars';
    else if (file.fieldname === 'customerDoc') uploadPath = 'uploads/customer-documents';
    else if (file.fieldname === 'orderDoc') uploadPath = 'uploads/order-documents';
    
    try {
      ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      cb(new Error('Failed to create upload directory'), '');
    }
  },
  filename: (_req, file, cb) => {
    try {
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      
      // Sanitize extension to prevent path traversal
      const sanitizedExt = ext.replace(/[^a-zA-Z0-9.-]/g, '');
      
      cb(null, `${Date.now()}-${uniqueSuffix}${sanitizedExt}`);
    } catch (error) {
      cb(new Error('Failed to generate filename'), '');
    }
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  };

  const allAllowed = [...allowedMimes.image, ...allowedMimes.document];

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, XLS, XLSX)'));
  }
};

// Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5,
  },
});

// Upload configurations
export const uploadSingle = upload.single('file');
export const uploadAvatar = upload.single('avatar');
export const uploadCustomerDoc = upload.single('customerDoc');
export const uploadOrderDoc = upload.single('orderDoc');
export const uploadMultiple = upload.array('files', 5);

// Delete file helper
export const deleteFile = (filepath: string): boolean => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};