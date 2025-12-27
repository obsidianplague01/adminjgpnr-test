import { z } from 'zod';

export const updateRegionalSettingsSchema = z.object({
  body: z.object({
    currency: z.string().length(3).optional(),
    currencySymbol: z.string().max(5).optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12', '24']).optional(),
  }),
});

export const updateOperatingHoursSchema = z.object({
  body: z.object({
    operatingDays: z.array(z.string()).optional(),
    openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    isOpen24Hours: z.boolean().optional(),
  }),
});

export const updateEmailFooterSchema = z.object({
  body: z.object({
    emailFooter: z.string().max(1000).optional(),
    emailFooterEnabled: z.boolean().optional(),
  }),
});

export const updatePaymentGatewaySchema = z.object({
  body: z.object({
    paystackEnabled: z.boolean().optional(),
    paystackPublicKey: z.string().optional(),
    paystackSecretKey: z.string().optional(),
    flutterwaveEnabled: z.boolean().optional(),
    flutterwavePublicKey: z.string().optional(),
    flutterwaveSecretKey: z.string().optional(),
    flutterwaveEncKey: z.string().optional(),
  }),
});

export const updateTransactionSettingsSchema = z.object({
  body: z.object({
    autoConfirmPayment: z.boolean().optional(),
    allowPartialPayment: z.boolean().optional(),
    paymentTimeout: z.number().int().min(5).max(120).optional(),
    sendPaymentReceipt: z.boolean().optional(),
  }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    notifyOnNewOrder: z.boolean().optional(),
    notifyOnPayment: z.boolean().optional(),
    notifyLowInventory: z.boolean().optional(),
  }),
});