// src/modules/auth/twoFactor.service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

export class TwoFactorService {
  /**
   * Generate 2FA secret for user
   */
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

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `JGPNR (${user.email})`,
      issuer: 'JGPNR Paintball',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (unverified)
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

  /**
   * Enable 2FA after verification
   */
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

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new AppError(400, 'Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    logger.info(`2FA enabled for user: ${user.email}`);

    return {
      message: '2FA enabled successfully',
      backupCodes,
    };
  }

  /**
   * Verify 2FA token
   */
  async verifyToken(userId: string, token: string, isBackupCode = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, '2FA not enabled');
    }

    // Check backup code first
    if (isBackupCode) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes || '[]');
      const codeIndex = backupCodes.indexOf(token);

      if (codeIndex === -1) {
        throw new AppError(400, 'Invalid backup code');
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
      });

      logger.info(`Backup code used for user: ${user.email}`);
      return true;
    }

    // Verify TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });

    if (!isValid) {
      throw new AppError(400, 'Invalid 2FA code');
    }

    return true;
  }

  /**
   * Disable 2FA
   */
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

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new AppError(400, '2FA not enabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid password');
    }

    const backupCodes = this.generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
    });

    logger.info(`Backup codes regenerated for user: ${user.email}`);

    return { backupCodes };
  }
}