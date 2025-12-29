// src/middleware/upload.ts 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../utils/logger';
import { promises as fsPromises } from 'fs';
import { Response, NextFunction } from 'express';
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


const MAX_FILES = 5;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;


const uploadsDir = process.env.UPLOADS_DIR || './uploads/documents';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const sanitized = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  }
});



export const postUploadValidation = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) return next();
  
  // Validate BEFORE writing to disk
  const isValid = await validateUploadedBuffer(req.file.buffer);
  
  if (!isValid) {
    return res.status(400).json({ error: 'File validation failed' });
  }

  const finalPath = path.join(uploadsDir, `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`);
  await fsPromises.writeFile(finalPath, req.file.buffer);
  req.file.path = finalPath;
  
  next();
};
async function validateUploadedBuffer(buffer: Buffer): Promise<boolean> {
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) return false;

  const allowedTypes = ['jpg', 'png', 'gif', 'webp', 'pdf', 'docx', 'xlsx'];
  if (!allowedTypes.includes(fileType.ext)) return false;

  const content = buffer.toString('utf8', 0, 1024);
  const dangerousPatterns = [/<script/i, /<\?php/i, /<%/, /#!/];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) return false;
  }

  return true;
}
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
    fileSize: MAX_DOCUMENT_SIZE,
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
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_AVATAR_SIZE },
});
export const uploadCustomerDoc = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE },
});
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
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE }
});