import { Router } from 'express';
import * as customerController from './customer.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, schemas } from '../../middleware/validate';
import { uploadMiddleware } from '../../middleware/upload';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get customer stats (Admin only)
router.get('/stats',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.getCustomerStats
);

// Get top customers (Admin only)
router.get('/top',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.getTopCustomers
);

// Search customers
router.get('/search',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.searchCustomers
);

// List all customers
router.get('/',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.listCustomers
);

// Create customer
router.post('/',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  validate(schemas.createCustomer),
  customerController.createCustomer
);

// Get customer by ID
router.get('/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.getCustomer
);

// Update customer
router.put('/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  validate(schemas.updateCustomer),
  customerController.updateCustomer
);

// Delete customer (Admin only)
router.delete('/:id',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.deleteCustomer
);

// Deactivate customer (Admin only)
router.post('/:id/deactivate',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate(schemas.customerStatusChange),
  customerController.deactivateCustomer
);

// Reactivate customer (Admin only)
router.post('/:id/reactivate',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate(schemas.customerStatusChange),
  customerController.reactivateCustomer
);

// Get customer orders
router.get('/:id/orders',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.getCustomerOrders
);

// Upload customer document
router.post('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  uploadMiddleware.single('document'),
  customerController.uploadDocument
);

// Download customer document
router.get('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  customerController.downloadDocument
);

// Delete customer document
router.delete('/:id/document',
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  customerController.deleteDocument
);

export default router;