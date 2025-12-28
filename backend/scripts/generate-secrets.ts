// scripts/generate-secrets.ts
import crypto from 'crypto';

const generateSecret = (length: number = 64): string => {
  return crypto.randomBytes(length).toString('base64');
};

console.log('# Add these to your .env file:');
console.log(`JWT_SECRET=${generateSecret(64)}`);
console.log(`JWT_REFRESH_SECRET=${generateSecret(64)}`);
console.log(`QR_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);