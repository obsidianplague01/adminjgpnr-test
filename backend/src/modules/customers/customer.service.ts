// src/modules/customers/customer.service.ts
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import fs from 'fs';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
} from './customer.schema';
import { logger } from '../../utils/logger';
import { deleteFile } from '../../middleware/upload';

export class CustomerService {
  /**
   * Create new customer
   */
  async createCustomer(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data,
    });

    logger.info(`Customer created: ${customer.email}`);
    return customer;
  }
 async uploadDocument(customerId: string, file: Express.Multer.File) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    deleteFile(file.path);
    throw new AppError(404, 'Customer not found');
  }

  if (customer.documentPath) {
    deleteFile(customer.documentPath);
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      documentPath: file.path,
      documentName: file.originalname,
    },
  });

  logger.info(`Document uploaded for customer: ${customerId}`);

  return {
    message: 'Document uploaded successfully',
    filename: file.filename,
    path: file.path,
  };
}

  async deleteDocument(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    if (customer.documentPath) {
      deleteFile(customer.documentPath);
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        documentPath: null,
        documentName: null,
      },
    });

    logger.info(`Document deleted for customer: ${customerId}`);

    return { message: 'Document deleted successfully' };
  }

  async getDocument(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { documentPath: true, documentName: true },
    });

    if (!customer || !customer.documentPath) {
      throw new AppError(404, 'Document not found');
    }

    if (!fs.existsSync(customer.documentPath)) {
      throw new AppError(404, 'Document file not found');
    }

    return {
      path: customer.documentPath,
      name: customer.documentName,
    };
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
            select: { orders: true },
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
  async updateCustomer(customerId: string, data: UpdateCustomerInput) {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    logger.info(`Customer updated: ${customer.email}`);
    return customer;
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(customerId: string) {
    // Check if customer has orders
    const orderCount = await prisma.order.count({
      where: { customerId },
    });

    if (orderCount > 0) {
      // Soft delete - mark as inactive
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: 'inactive' },
      });

      logger.info(`Customer soft deleted: ${customerId}`);
      return { message: 'Customer deactivated (has existing orders)' };
    }

    // Hard delete if no orders
    await prisma.customer.delete({
      where: { id: customerId },
    });

    logger.info(`Customer deleted: ${customerId}`);
    return { message: 'Customer deleted successfully' };
  }

  /**
   * Get customer purchase history
   */
  async getCustomerOrders(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

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
              scanCount: true,
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
   * Get customer statistics
   */
  async getCustomerStats() {
    const [total, active, inactive, withOrders] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'active' } }),
      prisma.customer.count({ where: { status: 'inactive' } }),
      prisma.customer.count({ where: { totalOrders: { gt: 0 } } }),
    ]);

    return {
      total,
      active,
      inactive,
      withOrders,
    };
  }
}