// tests/integration/api/analytics.integration.test.ts
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../../src/app';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();
let authToken: string;

beforeAll(async () => {
  // Create test user and get token
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@jgpnr.com',
      password: 'Test123!'
    });
  
  authToken = response.body.accessToken;

  // Seed test data
  await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe('Analytics API Integration', () => {
  describe('GET /api/analytics/kpi', () => {
    it('should return KPIs with valid token', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi?period=30d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('revenue');
      expect(response.body.revenue).toHaveProperty('current');
      expect(response.body.revenue).toHaveProperty('previous');
      expect(response.body.revenue).toHaveProperty('changePercent');
      expect(response.body.revenue).toHaveProperty('trend');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/analytics/kpi?period=30d')
        .expect(401);
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/kpi?period=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should use cache on subsequent requests', async () => {
      const start1 = Date.now();
      await request(app)
        .get('/api/analytics/kpi?period=30d')
        .set('Authorization', `Bearer ${authToken}`);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const response = await request(app)
        .get('/api/analytics/kpi?period=30d')
        .set('Authorization', `Bearer ${authToken}`);
      const duration2 = Date.now() - start2;

      expect(response.headers['x-cache']).toBe('HIT');
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
    });
  });

  describe('GET /api/analytics/revenue/overview', () => {
    it('should return monthly revenue breakdown', async () => {
      const response = await request(app)
        .get('/api/analytics/revenue/overview?period=90d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monthly');
      expect(Array.isArray(response.body.monthly)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('average');
      expect(response.body).toHaveProperty('peak');
    });
  });
});

async function seedTestData() {
  // Create test customers, orders, tickets
  const customers = await Promise.all(
    Array.from({ length: 50 }).map(() => 
      prisma.customer.create({
        data: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          location: faker.location.city()
        }
      })
    )
  );

  // Create orders for past 90 days
  for (const customer of customers) {
    const orderCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < orderCount; i++) {
      const purchaseDate = faker.date.recent({ days: 90 });
      await prisma.order.create({
        data: {
          orderNumber: `TEST-${Date.now()}-${faker.number.int({ max: 9999 })}`,
          customerId: customer.id,
          quantity: faker.number.int({ min: 1, max: 5 }),
          amount: faker.number.int({ min: 5000, max: 50000 }),
          status: 'COMPLETED',
          purchaseDate
        }
      });
    }
  }
}

async function cleanupTestData() {
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: 'TEST-' } } });
  await prisma.customer.deleteMany({ where: { email: { contains: '@example.com' } } });
}