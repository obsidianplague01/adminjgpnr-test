// src/modules/email/email.routes.ts
import { Router } from 'express';
import * as emailController from './email.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { emailLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import {
  createTemplateSchema,
  updateTemplateSchema,
  sendEmailSchema,
  createCampaignSchema,
  sendCampaignSchema,
} from './email.schema';

const router = Router();
router.use(authenticateJWT, requireAdmin);

// Templates
router.get('/templates', emailController.listTemplates);
router.get('/templates/:id', emailController.getTemplate);
router.post('/templates', validate(createTemplateSchema), auditLog('CREATE_TEMPLATE', 'EMAIL'), emailController.createTemplate);
router.patch('/templates/:id', validate(updateTemplateSchema), auditLog('UPDATE_TEMPLATE', 'EMAIL'), emailController.updateTemplate);
router.delete('/templates/:id', auditLog('DELETE_TEMPLATE', 'EMAIL'), emailController.deleteTemplate);

// Send email
router.post('/send', emailLimiter, validate(sendEmailSchema), auditLog('SEND_EMAIL', 'EMAIL'), emailController.sendEmail);
router.post('/test', emailController.testSMTP);

// Campaigns
router.get('/campaigns', emailController.listCampaigns);
router.post('/campaigns', validate(createCampaignSchema), auditLog('CREATE_CAMPAIGN', 'CAMPAIGN'), emailController.createCampaign);
router.post('/campaigns/:id/send', validate(sendCampaignSchema), auditLog('SEND_CAMPAIGN', 'CAMPAIGN'), emailController.sendCampaign);

export default router;