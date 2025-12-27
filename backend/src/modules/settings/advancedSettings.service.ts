import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

export class AdvancedSettingsService {
  
  async getAllSettings() {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    return {
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : '',
      paystackSecretKey: settings.paystackSecretKey ? '********' : '',
      flutterwaveSecretKey: settings.flutterwaveSecretKey ? '********' : '',
      flutterwaveEncKey: settings.flutterwaveEncKey ? '********' : '',
    };
  }

  async updateRegionalSettings(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Regional settings updated');
    return settings;
  }

  async updateOperatingHours(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Operating hours updated');
    return settings;
  }

  async updateEmailFooter(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Email footer updated');
    return settings;
  }

  async updatePaymentGateway(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Payment gateway settings updated');
    return settings;
  }

  async updateTransactionSettings(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Transaction settings updated');
    return settings;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(data: any) {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...await this.getDefaultSettings(), ...data },
    });

    logger.info('Notification preferences updated');
    return settings;
  }

  /**
   * Get login activities
   */
  async getLoginActivities(userId?: string, limit = 50) {
    const where: any = {};
    if (userId) where.userId = userId;

    const activities = await prisma.loginActivity.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return activities;
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId?: string) {
    const where: any = { expiresAt: { gt: new Date() } };
    if (userId) where.userId = userId;

    const sessions = await prisma.activeSession.findMany({
      where,
      orderBy: { lastActive: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return sessions;
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string, userId: string) {
    const session = await prisma.activeSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    await prisma.activeSession.delete({
      where: { id: sessionId },
    });

    logger.info(`Session terminated: ${sessionId}`);
    return { message: 'Session terminated successfully' };
  }

  /**
   * Terminate all sessions except current
   */
  async terminateAllSessions(userId: string, exceptSessionId?: string) {
    const where: any = { userId };
    if (exceptSessionId) {
      where.NOT = { id: exceptSessionId };
    }

    const result = await prisma.activeSession.deleteMany({ where });

    logger.info(`Terminated ${result.count} sessions for user ${userId}`);
    return { message: `${result.count} sessions terminated` };
  }

  /**
   * Helper: Get default settings
   */
  private async getDefaultSettings() {
    return {
      businessName: 'JGPNR Paintball',
      businessEmail: process.env.BUSINESS_EMAIL || 'info@jgpnr.com',
      businessPhone: process.env.BUSINESS_PHONE || '+234-XXX',
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      senderName: process.env.SENDER_NAME || 'JGPNR',
      senderEmail: process.env.SENDER_EMAIL || 'noreply@jgpnr.com',
    };
  }

  /**
   * Helper: Create default settings
   */
  private async createDefaultSettings() {
    return await prisma.systemSettings.create({
      data: {
        id: 1,
        ...await this.getDefaultSettings(),
      },
    });
  }
}
