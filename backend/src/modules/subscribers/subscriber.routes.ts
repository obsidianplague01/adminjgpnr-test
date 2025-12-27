// src/modules/subscribers/subscriber.routes.ts
import { Router } from 'express';
import * as subscriberController from './subscriber.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { exportLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../middleware/audit';
import { createSubscriberSchema, updateSubscriberSchema, listSubscribersSchema } from './subscriber.schema';

const router = Router();
router.use(authenticateJWT, requireAdmin);

router.get('/', validate(listSubscribersSchema), subscriberController.listSubscribers);
router.get('/stats', subscriberController.getSubscriberStats);
router.get('/:id', subscriberController.getSubscriber);

router.post(
  '/',
  validate(createSubscriberSchema),
  auditLog('CREATE_SUBSCRIBER', 'SUBSCRIBER'),
  subscriberController.createSubscriber
);

router.patch(
  '/:id',
  validate(updateSubscriberSchema),
  auditLog('UPDATE_SUBSCRIBER', 'SUBSCRIBER'),
  subscriberController.updateSubscriber
);

router.delete(
  '/:id',
  auditLog('DELETE_SUBSCRIBER', 'SUBSCRIBER'),
  subscriberController.deleteSubscriber
);

router.post('/export', exportLimiter, subscriberController.exportSubscribers);

export default router;