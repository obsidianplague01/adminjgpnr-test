// src/modules/customers/customer.service.ts
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
} from './customer.schema';
import { AuditLogger, AuditAction, AuditEntity, AuditContext } from '../../utils/audit';

export class CustomerService {
  /**
   * Create new customer
   */
  async createCustomer(data: CreateCustomerInput, context: AuditContext) {
    // Check if customer already exists
    const existing = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError(400, 'Customer with this email already exists');
    }

    const customer = await prisma.customer.create({
      data: {
        ...data,
        status: 'active',
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_CREATED,
      entity: AuditEntity.CUSTOMER,
      entityId: customer.id,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        location: customer.location,
      },
      context,
    });

    logger.info(`Customer created: ${customer.email}`, {
      customerId: customer.id,
      createdBy: context.userId,
    });

    return customer;
  }

  /**
   * List customers with filters
   */
  async listCustomers(filters: ListCustomersInput) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { purchaseDate: 'desc' },
          take: 10,
          include: {
            tickets: {
              select: {
                id: true,
                ticketCode: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    return customer;
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string) {
    const customer = await prisma.customer.findUnique({
      where: { email },
      include: {
        orders: {
          orderBy: { purchaseDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    return customer;
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, data: UpdateCustomerInput, context: AuditContext) {
    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Customer not found');
    }

    // If email is being changed, check uniqueness
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.customer.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new AppError(400, 'Email already in use by another customer');
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    // ✅ Audit log - track what changed
    const changes: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (existing[key as keyof typeof existing] !== value) {
        changes[key] = {
          from: existing[key as keyof typeof existing],
          to: value,
        };
      }
    }

    await AuditLogger.log({
      action: AuditAction.CUSTOMER_UPDATED,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        changes,
      },
      context,
    });

    logger.info(`Customer updated: ${customer.email}`, {
      customerId,
      updatedBy: context.userId,
      changedFields: Object.keys(changes),
    });

    return customer;
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id: string, context: AuditContext) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        totalOrders: true,
        totalSpent: true,
      },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    // ✅ Check if customer has orders
    const orderCount = await prisma.order.count({
      where: { customerId: id },
    });

    if (orderCount > 0) {
      throw new AppError(400, `Cannot delete customer with existing orders (${orderCount} orders found). Deactivate instead.`);
    }

    // ✅ Audit BEFORE deletion (so we have the data)
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_DELETED,
      entity: AuditEntity.CUSTOMER,
      entityId: id,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent.toString(),
      },
      context,
    });

    // Perform deletion
    await prisma.customer.delete({
      where: { id },
    });

    logger.info(`Customer deleted: ${customer.email}`, {
      customerId: id,
      deletedBy: context.userId,
    });

    return { message: 'Customer deleted successfully' };
  }

  /**
   * Deactivate customer
   */
  async deactivateCustomer(customerId: string, reason: string, context: AuditContext) {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Customer not found');
    }

    if (existing.status === 'inactive') {
      throw new AppError(400, 'Customer is already inactive');
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { 
        status: 'inactive',
        notes: existing.notes 
          ? `${existing.notes}\n\nDeactivated: ${reason}`
          : `Deactivated: ${reason}`,
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_DEACTIVATED,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        reason,
        previousStatus: existing.status,
      },
      context,
    });

    logger.info(`Customer deactivated: ${customer.email}`, {
      customerId,
      deactivatedBy: context.userId,
      reason,
    });

    return customer;
  }

  /**
   * Reactivate customer
   */
  async reactivateCustomer(customerId: string, reason: string, context: AuditContext) {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      throw new AppError(404, 'Customer not found');
    }

    if (existing.status === 'active') {
      throw new AppError(400, 'Customer is already active');
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { 
        status: 'active',
        notes: existing.notes 
          ? `${existing.notes}\n\nReactivated: ${reason}`
          : `Reactivated: ${reason}`,
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_ACTIVATED,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        reason,
        previousStatus: existing.status,
      },
      context,
    });

    logger.info(`Customer reactivated: ${customer.email}`, {
      customerId,
      reactivatedBy: context.userId,
      reason,
    });

    return customer;
  }

  /**
   * Get customer stats
   */
  async getCustomerStats() {
    const [total, active, inactive, newThisMonth] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'active' } }),
      prisma.customer.count({ where: { status: 'inactive' } }),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      newThisMonth,
    };
  }

  /**
   * Get top customers
   */
  async getTopCustomers(limit = 10) {
    const customers = await prisma.customer.findMany({
      where: {
        status: 'active',
        totalOrders: { gt: 0 },
      },
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        totalOrders: true,
        totalSpent: true,
        lastPurchase: true,
      },
    });

    return customers;
  }

  /**
   * Search customers
   */
  async searchCustomers(query: string, limit = 10) {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        location: true,
      },
    });

    return customers;
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: {
          tickets: {
            select: {
              id: true,
              ticketCode: true,
              status: true,
            },
          },
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Upload customer document
   */
  async uploadDocument(customerId: string, file: Express.Multer.File, context: AuditContext) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    // Delete old document if exists
    if (customer.documentPath) {
      try {
        const oldDocPath = path.join(process.cwd(), customer.documentPath);
        await fs.unlink(oldDocPath);
      } catch (error) {
        logger.warn(`Failed to delete old document:`, error);
      }
    }

    const relativePath = file.path.replace(/\\/g, '/');
    
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { 
        documentPath: `/${relativePath}`,
        documentName: file.originalname,
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_DOCUMENT_UPLOADED,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        previousDocument: customer.documentName,
      },
      context,
    });

    logger.info(`Document uploaded for customer: ${customer.email}`, {
      customerId,
      fileName: file.originalname,
      uploadedBy: context.userId,
    });
    
    return updated;
  }

  /**
   * Delete customer document
   */
  async deleteDocument(customerId: string, context: AuditContext) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    if (!customer.documentPath) {
      throw new AppError(404, 'No document found for this customer');
    }

    const documentName = customer.documentName;

    // Delete file from filesystem
    try {
      const docPath = path.join(process.cwd(), customer.documentPath);
      await fs.unlink(docPath);
    } catch (error) {
      logger.error(`Failed to delete document file:`, error);
      throw new AppError(500, 'Failed to delete document file');
    }

    // Update customer record
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { 
        documentPath: null,
        documentName: null,
      },
    });

    // ✅ Audit log
    await AuditLogger.log({
      action: AuditAction.CUSTOMER_DOCUMENT_DELETED,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        deletedFileName: documentName,
      },
      context,
    });

    logger.info(`Document deleted for customer: ${customer.email}`, {
      customerId,
      deletedBy: context.userId,
    });
    
    return updated;
  }

  /**
   * Get customer document
   */
  async getDocument(customerId: string, context: AuditContext) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    if (!customer.documentPath) {
      throw new AppError(404, 'No document found for this customer');
    }

    const fullPath = path.join(process.cwd(), customer.documentPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new AppError(404, 'Document file not found on disk');
    }

    // ✅ Audit document access
    await AuditLogger.log({
      action: AuditAction.DATA_EXPORT,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      details: {
        email: customer.email,
        name: `${customer.firstName} ${customer.lastName}`,
        documentName: customer.documentName,
        exportType: 'DOCUMENT_DOWNLOAD',
      },
      context,
    });

    return {
      path: fullPath,
      name: customer.documentName || 'document',
    };
  }
}