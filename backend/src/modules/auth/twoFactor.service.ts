// src/modules/auth/twoFactor.service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import * as crypto from 'crypto';


export class TwoFactorService {
  
  async generateSecret(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.twoFactorEnabled) {
      throw new AppError(400, '2FA already enabled');
    }
    const secret = speakeasy.generateSecret({
      name: `JGPNR (${user.email})`,
      issuer: 'JGPNR Paintball',
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    logger.info(`2FA secret generated for user: ${user.email}`);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.base32,
    };
  }

  async enableTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.twoFactorEnabled) {
      throw new AppError(400, '2FA already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new AppError(400, 'No 2FA secret found. Generate one first.');
    }
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new AppError(400, 'Invalid verification code');
    }

    const backupCodes = await this.generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes.hashed),
      },
    });

    logger.info(`2FA enabled for user: ${user.email}`);

    return {
      message: '2FA enabled successfully',
      backupCodes: backupCodes.codes, // show once
    };
  }

  
  async verifyToken(userId: string, token: string, isBackupCode = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, '2FA not enabled');
    }

    if (isBackupCode) {
      if (!user.twoFactorBackupCodes) {
        throw new AppError(400, 'No backup codes available');
      }

      const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);

      let matchIndex = -1;

      for (let i = 0; i < backupCodes.length; i++) {
        if (await bcrypt.compare(token, backupCodes[i])) {
          matchIndex = i;
          break; 
        }
      }

      if (matchIndex === -1) {
        throw new AppError(400, 'Invalid backup code');
      }

      backupCodes.splice(matchIndex, 1);

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: backupCodes.length
            ? JSON.stringify(backupCodes)
            : null, 
        },
      });

      return true;
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new AppError(400, 'Invalid 2FA code');
    }

    return true;
  }
  async disableTwoFactor(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    logger.info(`2FA disabled for user: ${user.email}`);

    return { message: '2FA disabled successfully' };
  }

  private async generateBackupCodes(): Promise<{ codes: string[]; hashed: string[] }> {
    const codes: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      hashed.push(await bcrypt.hash(code, 12));
    }

    return { codes, hashed };
  }


 

  async regenerateBackupCodes(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new AppError(400, '2FA not enabled');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    const backupCodes = await this.generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
    });

    logger.info(`Backup codes regenerated for user: ${user.email}`);
    return {
        backupCodes: backupCodes.codes
    };
  }
}