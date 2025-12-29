import { Router } from 'express';
import * as customerController from './customer.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, schemas } from '../../middleware/validate';
import { uploadMiddleware } from '../../middleware/upload';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/stats',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.getCustomerStats
);

router.get('/top',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.getTopCustomers
);

router.get('/search',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.searchCustomers
);

router.get('/',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.listCustomers
);

router.post('/',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  validate(schemas.createCustomer),
  customerController.createCustomer
);

router.get(
  '/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  validate(schemas.idParam),
  customerController.getCustomer
);



router.put('/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  validate(schemas.updateCustomer),
  customerController.updateCustomer
);

router.delete('/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.deleteCustomer
);

router.post('/:id/deactivate',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate(schemas.customerStatusChange),
  customerController.deactivateCustomer
);

router.post('/:id/reactivate',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate(schemas.customerStatusChange),
  customerController.reactivateCustomer
);

router.get('/:id/orders',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.getCustomerOrders
);

router.post('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  uploadMiddleware.single('document'),
  customerController.uploadDocument
);

router.get('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.downloadDocument
);

router.delete('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.deleteDocument
);

export default router;