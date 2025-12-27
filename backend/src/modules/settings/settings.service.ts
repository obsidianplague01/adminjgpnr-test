// src/modules/settings/settings.service.ts
import prisma from '../../config/database';
import { logger } from '../../utils/logger';

export class SettingsService {
  async getSystemSettings() {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 1,
          businessName: 'JGPNR Paintball',
          businessEmail: 'info@jgpnr.com',
          businessPhone: '+234-XXX-XXX-XXXX',
          smtpHost: process.env.SMTP_HOST || '',
          smtpPort: parseInt(process.env.SMTP_PORT || '587'),
          smtpUser: process.env.SMTP_USER || '',
          smtpPassword: process.env.SMTP_PASSWORD || '',
          senderName: process.env.SENDER_NAME || 'JGPNR',
          senderEmail: process.env.SENDER_EMAIL || 'noreply@jgpnr.com',
        },
      });
    }

    return settings;
  }

  async updateSystemSettings(data: Partial<any>) {
  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { 
      id: 1,
      businessName: data.businessName || 'JGPNR Paintball',
      businessEmail: data.businessEmail || 'info@jgpnr.com',
      businessPhone: data.businessPhone || '+234-XXX',
      smtpHost: data.smtpHost || process.env.SMTP_HOST || '',
      smtpPort: data.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: data.smtpUser || process.env.SMTP_USER || '',
      smtpPassword: data.smtpPassword || process.env.SMTP_PASSWORD || '',
      senderName: data.senderName || 'JGPNR',
      senderEmail: data.senderEmail || 'noreply@jgpnr.com',
    },
  });

  logger.info('System settings updated');
  return settings;
}
}

