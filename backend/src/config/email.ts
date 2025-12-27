// src/config/email.ts
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

export const createTransporter = async () => {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    // Verify connection
    await transporter.verify();
    logger.info('SMTP connection established');
    
    return transporter;
  } catch (error) {
    logger.error('SMTP connection failed:', error);
    throw error;
  }
};

export const getTransporter = async () => {
  if (!transporter) {
    return await createTransporter();
  }
  return transporter;
};

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const transport = await getTransporter();
    
    const mailOptions = {
      from: `${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error('Email send failed:', error);
    throw error;
  }
};