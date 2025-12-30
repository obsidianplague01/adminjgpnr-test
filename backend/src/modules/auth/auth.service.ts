// src/modules/auth/auth.service.ts
import * as jwt from 'jsonwebtoken';
import { accountLockout } from '../../middleware/rateLimit';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { LoginInput, CreateUserInput, UpdateUserInput, ChangePasswordInput } from './auth.schema';
import { Prisma, UserRole } from '@prisma/client';
import { logger } from '../../utils/logger';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import { blacklistToken } from '../../middleware/auth';
import { emailQueue } from '../../config/queue';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}
const getSaltRounds = (): number => {
  const envRounds = parseInt(process.env.BCRYPT_ROUNDS || '14');
  if (envRounds < 14 || envRounds > 18) { 
    logger.warn(`Invalid BCRYPT_ROUNDS (${envRounds}), using default 14`);
    return 14;
  }
  return envRounds;
};

const SALT_ROUNDS = getSaltRounds();


interface ListUsersInput {
  page: number;
  limit: number;
  search?: string;
  tokenVersion: number;
  role?: string;
  status?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async login(data: LoginInput, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const lockoutStatus = await accountLockout(data.email, false);
  
    if (lockoutStatus.locked) {
      logger.warn('Login attempted on locked account', { email: data.email });
      throw new AppError(429, `Account temporarily locked. Try again after ${lockoutStatus.unlockAt?.toLocaleTimeString()}`);
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

   if (!user || !user.isActive) {
      await accountLockout(data.email, false);
      throw new AppError(401, 'Invalid credentials');
   }

    const isValidPassword = await bcrypt.compare(data.password, user.password);
  
    if (!isValidPassword) {
      await accountLockout(data.email, false);
      throw new AppError(401, 'Invalid credentials');
    }

    await accountLockout(data.email, true);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion, 
    };

    const accessToken = jwt.sign(
      payload, 
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as jwt.SignOptions
    );

    logger.info(`User logged in: ${user.email}`);
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    await prisma.activeSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: accessToken,
        ipAddress: ipAddress || 'unknown', 
        userAgent: userAgent || 'unknown',  
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }
    });
    await prisma.activeSession.deleteMany({
      where: { userId: user.id }
    });

    return { 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken, 
      refreshToken 
    };
  }

  async refreshToken(token: string) {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid refresh token');
    }
    
    // Blacklist old refresh token
    const tokenExp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    await blacklistToken(token, tokenExp - Math.floor(Date.now() / 1000));
    
    const newRefreshToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as jwt.SignOptions
    );

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' } as jwt.SignOptions
    );
    
    return { accessToken, refreshToken: newRefreshToken };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async createUser(data: CreateUserInput) {
    
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info(`User created: ${user.email}`);

    return user;
  }

  async updateUser(userId: string, data: UpdateUserInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    logger.info(`User updated: ${user.email}`);

    return user;
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const isValidPassword = await bcrypt.compare(
      data.currentPassword,
      user.password
    );

    if (!isValidPassword) {
      throw new AppError(401, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        tokenVersion: { increment: 1 }, // ✅ Invalidate all tokens
      },
    });

    logger.info(`Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  async listUsers(filters: ListUsersInput) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (filters.role) {
    where.role = filters.role as UserRole;
  }

  if (filters.status) {
    // Note: User model uses isActive (boolean), not status (string)
    where.isActive = filters.status === 'active';
  }

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
  }

  async deactivateUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    logger.info(`User deactivated: ${userId}`);

    return { message: 'User deactivated successfully' };
  }
  async reactivateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (user.isActive) {
    throw new AppError(400, 'User is already active');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  logger.info(`User reactivated: ${updated.email}`);
  return updated;
  }
  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new AppError(403, 'Cannot delete super admin');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info(`User deleted: ${user.email}`);
    return { message: 'User deleted successfully' };
  }
  async getUserActivity(userId: string, limit = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const activity = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, 
      take: limit,
      select: {
        id: true,
        action: true,
        entity: true,        
        details: true,
        createdAt: true,     
        ipAddress: true,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      lastLoginAt: user.lastLoginAt,
      activity,
    };
  }
  private async generateBackupCodes(): Promise<{ codes: string[], hashed: string[] }> {
    const codes: string[] = [];
    const hashed: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      hashed.push(await bcrypt.hash(code, 12));
    }
    
    return { codes, hashed };
  }
  async enable2FA(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.twoFactorEnabled) {
      throw new AppError(400, '2FA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `JGPNR (${user.email})`,
      issuer: 'JGPNR Admin',
    });
    
    const { codes, hashed } = await this.generateBackupCodes();
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(hashed),
      },
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    logger.info(`2FA setup initiated for user: ${user.email}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes: codes,
      message: 'Scan QR code with authenticator app and verify',
    };
  }
  async verify2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new AppError(400, '2FA not set up');
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before/after
    });

    if (!verified) {
      throw new AppError(400, 'Invalid verification code');
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    logger.info(`2FA enabled for user: ${user.email}`);

    return {
      message: '2FA successfully enabled',
      enabled: true,
    };
  }
  async disable2FA(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new AppError(400, '2FA is not enabled');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
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

    return {
      message: '2FA successfully disabled',
      enabled: false,
    };
  }
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If account exists, reset email sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 12);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
        tokenVersion: { increment: 1 } // ✅ Invalidate existing sessions
      }
    });

    // Send email with resetToken (not hashed version)
    await emailQueue.add('password-reset', {
      email: user.email,
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    });

    return { message: 'If account exists, reset email sent' };
  }
  async resetPassword(token: string, newPassword: string) {
    const users = await prisma.user.findMany({
      where: {
        resetTokenExpiry: { gt: new Date() }
      }
    });

    let matchedUser = null;
    for (const user of users) {
      if (user.resetToken && await bcrypt.compare(token, user.resetToken)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 14);
    
    await prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 } // ✅ Invalidate all sessions
      }
    });

    return { message: 'Password reset successful' };
  }

}