// src/modules/customers/customer.routes.ts
import { Router } from 'express';
import * as customerController from './customer.controller';
import { validate } from '../../middleware/validate';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
} from './customer.schema';
import { uploadCustomerDoc } from '../../middleware/upload';
const router = Router();

router.use(authenticateJWT);

router.get('/', validate(listCustomersSchema), customerController.listCustomers);
router.get('/stats', customerController.getCustomerStats);
router.get('/:id', customerController.getCustomer);
router.get('/:id/orders', customerController.getCustomerOrders);

router.post(
  '/',
  requireAdmin,
  validate(createCustomerSchema),
  auditLog('CREATE_CUSTOMER', 'CUSTOMER'),
  customerController.createCustomer
);

router.patch(
  '/:id',
  requireAdmin,
  validate(updateCustomerSchema),
  auditLog('UPDATE_CUSTOMER', 'CUSTOMER'),
  customerController.updateCustomer
);

router.delete(
  '/:id',
  requireAdmin,
  auditLog('DELETE_CUSTOMER', 'CUSTOMER'),
  customerController.deleteCustomer
);
router.post(
  '/:id/document',
  requireAdmin,
  uploadCustomerDoc,
  auditLog('UPLOAD_DOCUMENT', 'CUSTOMER'),
  customerController.uploadDocument
);

router.delete(
  '/:id/document',
  requireAdmin,
  auditLog('DELETE_DOCUMENT', 'CUSTOMER'),
  customerController.deleteDocument
);

router.get('/:id/document', customerController.downloadDocument);
export default router;