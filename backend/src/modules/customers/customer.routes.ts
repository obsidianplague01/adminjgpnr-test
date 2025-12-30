import { Router } from 'express';
import * as customerController from './customer.controller';
import { authenticate, requireAdmin, requireStaff } from '../../middleware/auth';
import { validate, schemas } from '../../middleware/validate';
import { uploadMiddleware } from '../../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/stats',
  requireAdmin,
  customerController.getCustomerStats
);

router.get('/top',
  requireAdmin,
  customerController.getTopCustomers
);

router.get('/search',
  requireStaff,
  customerController.searchCustomers
);

router.get('/',
  requireStaff,
  customerController.listCustomers
);

router.post('/',
  requireStaff,
  validate(schemas.createCustomer),
  customerController.createCustomer
);

router.get(
  '/:id',
  requireStaff,
  validate(schemas.idParam),
  customerController.getCustomer
);

router.put('/:id',
  requireStaff,
  validate(schemas.updateCustomer),
  customerController.updateCustomer
);

router.delete('/:id',
  requireAdmin,
  customerController.deleteCustomer
);

router.post('/:id/deactivate',
  requireAdmin,
  validate(schemas.customerStatusChange),
  customerController.deactivateCustomer
);

router.post('/:id/reactivate',
  requireAdmin,
  validate(schemas.customerStatusChange),
  customerController.reactivateCustomer
);

router.get('/:id/orders',
  requireStaff,
  customerController.getCustomerOrders
);

router.post('/:id/document',
  requireStaff,
  uploadMiddleware.single('document'),
  customerController.uploadDocument
);

router.get('/:id/document',
  requireStaff,
  customerController.downloadDocument
);

router.delete('/:id/document',
  requireAdmin,
  customerController.deleteDocument
);

export default router;