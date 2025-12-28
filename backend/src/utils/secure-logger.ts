import { logger as winstonLogger } from './logger';

interface LogData {
  [key: string]: any;
}

const PII_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'refreshToken',
  'accessToken',
  'email',
  'phone',
  'whatsapp',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'dateOfBirth',
  'address',
  'ipAddress',  
];
const redactSensitiveData = (data: any, depth = 0): any => {
  if (depth > 10) return '[MAX_DEPTH]';  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    return data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item, depth + 1));
  }
  
  if (typeof data === 'object') {
    const redacted: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      const isSensitive = PII_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }
    
    return redacted;
  }
  
  return data;
};

export class SecureLogger {
  info(message: string, data?: LogData) {
    winstonLogger.info(message, redactSensitiveData(data));
  }

  warn(message: string, data?: LogData) {
    winstonLogger.warn(message, redactSensitiveData(data));
  }

  error(message: string, error?: Error | any, data?: LogData) {
    const redactedData = redactSensitiveData(data);
    
    if (error instanceof Error) {
      winstonLogger.error(message, {
        error: error.message,
        stack: error.stack,
        ...redactedData,
      });
    } else {
      winstonLogger.error(message, {
        error: redactSensitiveData(error),
        ...redactedData,
      });
    }
  }

  debug(message: string, data?: LogData) {
    // Only log debug in development
    if (process.env.NODE_ENV === 'development') {
      winstonLogger.debug(message, redactSensitiveData(data));
    }
  }
}

export const secureLogger = new SecureLogger();