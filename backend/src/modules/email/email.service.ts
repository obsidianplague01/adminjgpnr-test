// src/modules/email/email.service.ts
import { CampaignStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail } from '../../config/email';
import { emailQueue, campaignQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  SendEmailInput,
  CreateCampaignInput,
} from './email.schema';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class EmailService {
  private sanitizeHTML(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
    });
  }

  /**
   * Create email template
   */
  async createTemplate(data: CreateTemplateInput) {
    const sanitizedBody = this.sanitizeHTML(data.body);

    const template = await prisma.emailTemplate.create({
      data: {
        ...data,
        body: sanitizedBody,
      },
    });

    logger.info(`Email template created: ${template.name}`);
    return template;
  }

  /**
   * List templates
   */
  async listTemplates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailTemplate.count(),
    ]);

    return {
      templates,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get template
   */
  async getTemplate(templateId: string) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, data: UpdateTemplateInput) {
    if (data.body) {
      data.body = this.sanitizeHTML(data.body);
    }

    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data,
    });

    logger.info(`Template updated: ${template.name}`);
    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string) {
    await prisma.emailTemplate.delete({
      where: { id: templateId },
    });

    logger.info(`Template deleted: ${templateId}`);
    return { message: 'Template deleted successfully' };
  }

  /**
   * Send individual email
   */
  async sendSingleEmail(data: SendEmailInput) {
    let emailBody = data.body;
    let emailSubject = data.subject;

    // Use template if provided
    if (data.templateId) {
      const template = await this.getTemplate(data.templateId);
      emailBody = template.body;
      emailSubject = template.subject;
    }

    // Sanitize
    emailBody = this.sanitizeHTML(emailBody);

    // Queue email
    await emailQueue.add('single-email', {
      to: data.to,
      subject: emailSubject,
      html: emailBody,
    });

    logger.info(`Email queued to: ${data.to}`);
    return { message: 'Email queued successfully' };
  }

  /**
   * Create campaign
   */
  async createCampaign(data: CreateCampaignInput) {
    let body = data.body;

    if (data.templateId) {
      const template = await this.getTemplate(data.templateId);
      body = template.body;
    }

    const campaign = await prisma.campaign.create({
      data: {
        subject: data.subject,
        body: this.sanitizeHTML(body),
        templateId: data.templateId,
        status: CampaignStatus.DRAFT,
      },
    });

    logger.info(`Campaign created: ${campaign.id}`);
    return campaign;
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }

    if (campaign.status === CampaignStatus.SENT) {
      throw new AppError(400, 'Campaign already sent');
    }

    // Get active subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: { status: 'active' },
    });

    if (subscribers.length === 0) {
      throw new AppError(400, 'No active subscribers');
    }

    // Queue campaign
    await campaignQueue.add('send-campaign', {
      campaignId,
      subscribers: subscribers.map(s => ({ email: s.email, name: s.name })),
    });

    // Update status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sentAt: new Date(),
        sentTo: subscribers.length,
      },
    });

    logger.info(`Campaign queued: ${campaignId} to ${subscribers.length} subscribers`);
    return { message: `Campaign queued to ${subscribers.length} subscribers` };
  }

  /**
   * List campaigns
   */
  async listCampaigns(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { name: true } },
        },
      }),
      prisma.campaign.count(),
    ]);

    return {
      campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Test SMTP configuration
   */
  async testSMTP(email: string) {
    try {
      await sendEmail({
        to: email,
        subject: 'JGPNR - SMTP Test',
        html: '<p>This is a test email. Your SMTP configuration is working correctly.</p>',
      });

      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      logger.error('SMTP test failed:', error);
      throw new AppError(500, 'SMTP test failed');
    }
  }
}