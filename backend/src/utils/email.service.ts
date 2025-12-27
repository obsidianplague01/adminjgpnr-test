// src/utils/email.service.ts
import nodemailer from 'nodemailer';
import { logger } from './logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Validate email address format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize email address
 */
const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Validate and sanitize multiple email addresses
 */
const validateEmails = (emails: string | string[]): string[] => {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  
  const sanitized = emailArray.map(sanitizeEmail);
  const invalid = sanitized.filter(email => !isValidEmail(email));
  
  if (invalid.length > 0) {
    throw new AppError(400, `Invalid email addresses: ${invalid.join(', ')}`);
  }
  
  return sanitized;
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP configuration missing in environment variables');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      throw new Error('Failed to initialize email service');
    }
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    cc?: string | string[];
    bcc?: string | string[];
  }) {
    try {
      const toAddresses = validateEmails(options.to);
      const ccAddresses = options.cc ? validateEmails(options.cc) : undefined;
      const bccAddresses = options.bcc ? validateEmails(options.bcc) : undefined;

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: toAddresses.join(', '),
        cc: ccAddresses?.join(', '),
        bcc: bccAddresses?.join(', '),
        subject: options.subject,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new AppError(500, 'Failed to send email');
    }
  }

  async sendOrderConfirmation(data: {
    to: string;
    firstName: string;
    lastName: string;
    orderNumber: string;
    tickets: Array<{ ticketCode: string; gameSession: string; validUntil: string }>;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .ticket { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName} ${data.lastName},</p>
            <p>Thank you for your order! Your order number is: <strong>${data.orderNumber}</strong></p>
            <h3>Your Tickets:</h3>
            ${data.tickets.map(ticket => `
              <div class="ticket">
                <p><strong>Ticket Code:</strong> ${ticket.ticketCode}</p>
                <p><strong>Game Session:</strong> ${ticket.gameSession}</p>
                <p><strong>Valid Until:</strong> ${new Date(ticket.validUntil).toLocaleDateString()}</p>
              </div>
            `).join('')}
            <p>Please present your ticket codes at the venue.</p>
          </div>
          <div class="footer">
            <p>JGPNR Paintball © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: `Order Confirmation - ${data.orderNumber}`,
      html,
    });
  }

  async sendPaymentReceipt(data: {
    to: string;
    firstName: string;
    lastName: string;
    orderNumber: string;
    amount: number;
    paymentReference: string;
    paidAt: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Receipt</h2>
          <p>Hi ${data.firstName} ${data.lastName},</p>
          <p>Your payment has been received successfully.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Order Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">₦${data.amount.toFixed(2)}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Reference:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.paymentReference}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date(data.paidAt).toLocaleString()}</td>
            </tr>
          </table>
          <p>Thank you for your payment!</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: `Payment Receipt - ${data.orderNumber}`,
      html,
    });
  }

  async sendTicketReminder(data: {
    to: string;
    firstName: string;
    ticketCode: string;
    gameSession: string;
    validUntil: string;
    remainingScans: number;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Ticket Reminder</h2>
          <p>Hi ${data.firstName},</p>
          <p>This is a reminder about your upcoming game session.</p>
          <div style="background: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Ticket Code:</strong> ${data.ticketCode}</p>
            <p><strong>Game Session:</strong> ${data.gameSession}</p>
            <p><strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleDateString()}</p>
            <p><strong>Remaining Scans:</strong> ${data.remainingScans}</p>
          </div>
          <p>See you at the venue!</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: 'Ticket Reminder - JGPNR Paintball',
      html,
    });
  }

  async sendTicketExpiration(data: {
    to: string;
    firstName: string;
    ticketCode: string;
    gameSession: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Ticket Expiration Notice</h2>
          <p>Hi ${data.firstName},</p>
          <p>Your ticket has expired.</p>
          <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Ticket Code:</strong> ${data.ticketCode}</p>
            <p><strong>Game Session:</strong> ${data.gameSession}</p>
          </div>
          <p>Please contact us if you need assistance.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: 'Ticket Expired - JGPNR Paintball',
      html,
    });
  }

  async sendPasswordReset(data: {
    to: string;
    firstName: string;
    lastName: string;
    resetLink: string;
  }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${data.firstName} ${data.lastName},</p>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          <p style="margin: 30px 0;">
            <a href="${data.resetLink}" 
               style="background: #4CAF50; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>If you didn't request this, please ignore this email.</p>
          <p style="color: #666; font-size: 12px;">This link expires in 1 hour.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.to,
      subject: 'Password Reset - JGPNR',
      html,
    });
  }
}

export const emailService = new EmailService();