import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateSubscriberInput, UpdateSubscriberInput, ListSubscribersInput } from './subscriber.schema';
import { Parser } from 'json2csv';
import { logger } from '../../utils/logger';

export class SubscriberService {
  async createSubscriber(data: CreateSubscriberInput) {
    const subscriber = await prisma.subscriber.create({ data });
    logger.info(`Subscriber added: ${subscriber.email}`);
    return subscriber;
  }

  async listSubscribers(filters: ListSubscribersInput) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriberWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [subscribers, total, activeCount] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
      }),
      prisma.subscriber.count({ where }),
      prisma.subscriber.count({ where: { status: 'active' } }),
    ]);

    return {
      subscribers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      activeCount,
    };
  }

  async getSubscriber(subscriberId: string) {
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
    });

    if (!subscriber) {
      throw new AppError(404, 'Subscriber not found');
    }

    return subscriber;
  }

  async updateSubscriber(subscriberId: string, data: UpdateSubscriberInput) {
    const subscriber = await prisma.subscriber.update({
      where: { id: subscriberId },
      data,
    });

    logger.info(`Subscriber updated: ${subscriber.email}`);
    return subscriber;
  }

  async deleteSubscriber(subscriberId: string) {
    await prisma.subscriber.delete({
      where: { id: subscriberId },
    });

    logger.info(`Subscriber deleted: ${subscriberId}`);
    return { message: 'Subscriber removed' };
  }

  async exportSubscribers(status?: string) {
    const where: Prisma.SubscriberWhereInput = {};
    if (status) where.status = status;

    const subscribers = await prisma.subscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
    });

    const fields = ['email', 'name', 'source', 'status', 'subscribedAt'];
    const parser = new Parser({ fields });
    const csv = parser.parse(subscribers);

    logger.info(`Exported ${subscribers.length} subscribers`);
    return csv;
  }

  async getSubscriberStats() {
    const [total, active, unsubscribed, recentCount] = await Promise.all([
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { status: 'active' } }),
      prisma.subscriber.count({ where: { status: 'unsubscribed' } }),
      prisma.subscriber.count({
        where: {
          subscribedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return { total, active, unsubscribed, recentCount };
  }
}

