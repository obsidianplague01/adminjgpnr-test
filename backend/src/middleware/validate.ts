// COMPREHENSIVE SANITIZATION
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  let cleaned = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
 
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  const ldapChars = ['*', '(', ')', '\\', '\0'];
  for (const char of ldapChars) {
    cleaned = cleaned.replace(new RegExp(char, 'g'), '');
  }
  
  return cleaned;
};

export const sanitizeMongoOperators = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    
    return obj.replace(/^\$/, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoOperators);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      
      const sanitizedKey = key.replace(/^\$/, '');
      
      if (['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizeMongoOperators(value);
    }
    
    return sanitized;
  }
  
  return obj;
};

export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      
      const sanitizedKey = sanitizeString(key);
      
      if (['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        logger.warn('Prototype pollution attempt detected', { key });
        continue;
      }
      
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    
    return sanitized;
  }
  
  return obj;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = sanitizeObject(sanitizeMongoOperators(req.body));
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    req.query = sanitizeObject(sanitizeMongoOperators(req.query));
  }
  
  next();
};