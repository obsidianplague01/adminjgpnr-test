// src/middleware/upload.ts 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../utils/logger';
import { promises as fsPromises } from 'fs';

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
];

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 12 * 1024 * 1024; 
const MAX_FILES = 5;


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
      const sanitizedExt = ext.replace(/[^a-zA-Z0-9.-]/g, '');

      cb(null, `${Date.now()}-${uniqueSuffix}${sanitizedExt}`);
    } catch (error) {
      cb(new Error('Failed to generate filename'), '');
    }
  },
});


const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  try {
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File extension ${ext} not allowed`));
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`MIME type ${file.mimetype} not allowed`));
    }

    const basename = path.basename(file.originalname);
    if (basename !== file.originalname) {
      return cb(new Error('Invalid filename: path traversal detected'));
    }

    const nameParts = file.originalname.split('.');
    if (nameParts.length > 2) {
      return cb(new Error('Multiple file extensions not allowed'));
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

export const validateUploadedFile = async (filepath: string): Promise<boolean> => {
  try {
    const buffer = await fsPromises.readFile(filepath);

    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      logger.warn('Could not determine file type from magic bytes', { filepath });
      await fsPromises.unlink(filepath);
      return false;
    }

    const allowedTypes = ['jpg', 'png', 'gif', 'webp', 'pdf', 'docx', 'xlsx'];
    if (!allowedTypes.includes(fileType.ext)) {
      logger.warn('File type mismatch', {
        filepath,
        claimedType: path.extname(filepath),
        actualType: fileType.ext,
      });
      await fsPromises.unlink(filepath);
      return false;
    }

    const content = buffer.toString('utf8', 0, 1024);
    const dangerousPatterns = [
      /<script/i,      
      /<\?php/i,       
      /<%/,            
      /#!/,            
      /__import__/i,   
      /eval\(/i,       
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        logger.warn('Malicious content detected in upload', { filepath });
        await fsPromises.unlink(filepath);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('File validation error:', error);
    return false;
  }
};


export const uploadSingle = upload.single('file');
export const uploadAvatar = upload.single('avatar');
export const uploadCustomerDoc = upload.single('customerDoc');
export const uploadOrderDoc = upload.single('orderDoc');
export const uploadMultiple = upload.array('files', MAX_FILES);

export const deleteFile = (filepath: string): boolean => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};