// src/utils/emailService.ts
export interface EmailOptions {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

export const emailCustomer = (
  email: string,
  customerName: string,
  subject: string = '',
  body: string = ''
): void => {
  // Build the mailto URL with proper encoding
  const defaultBody = body || `Dear ${customerName},\n\n`;
  const mailtoLink = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(defaultBody)}`;

  // Open in default email client
  window.location.href = mailtoLink;
};

export const navigateToSendMail = (options: EmailOptions): string => {
  const params = new URLSearchParams();
  
  if (options.to) params.append('to', options.to);
  if (options.subject) params.append('subject', options.subject);
  if (options.body) params.append('body', options.body);
  if (options.cc) params.append('cc', options.cc);
  if (options.bcc) params.append('bcc', options.bcc);

  return `/mail/send?${params.toString()}`;
};

export const sendTicketEmail = (
  email: string,
  customerName: string,
  ticketCode: string,
  orderNumber: string
): void => {
  const subject = `Your JGPNR Paintball Ticket - ${ticketCode}`;
  const body = `Dear ${customerName},

Thank you for your purchase!

Your ticket has been confirmed:
Ticket Code: ${ticketCode}
Order Number: ${orderNumber}

Please present this ticket at the venue for scanning. We look forward to seeing you!

Best regards,
JGPNR Paintball Team

www.jgpnr.ng
support@jgpnr.ng`;

  emailCustomer(email, customerName, subject, body);
};

export const sendWelcomeEmail = (email: string, customerName: string): void => {
  const subject = 'Welcome to JGPNR Paintball!';
  const body = `Dear ${customerName},

Welcome to JGPNR Paintball!

We're excited to have you as part of our community. Get ready for an amazing paintball experience!

If you have any questions, feel free to reach out to us anytime.

Best regards,
JGPNR Paintball Team

www.jgpnr.ng
support@jgpnr.ng`;

  emailCustomer(email, customerName, subject, body);
};

export const sendReminderEmail = (
  email: string,
  customerName: string,
  sessionDate: string,
  sessionTime: string
): void => {
  const subject = `Reminder: Your JGPNR Paintball Session - ${sessionDate}`;
  const body = `Dear ${customerName},

This is a friendly reminder about your upcoming paintball session:

Date: ${sessionDate}
Time: ${sessionTime}

Please arrive 15 minutes before your scheduled time.

We're excited to see you!

Best regards,
JGPNR Paintball Team

www.jgpnr.ng
support@jgpnr.ng`;

  emailCustomer(email, customerName, subject, body);
};