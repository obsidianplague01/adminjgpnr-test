"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tests/integration/api/analytics.integration.test.ts
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("../../../src/app"));
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
let authToken;
(0, vitest_1.beforeAll)(async () => {
    // Create test user and get token
    const response = await (0, supertest_1.default)(app_1.default)
        .post('/api/auth/login')
        .send({
        email: 'test@jgpnr.com',
        password: 'Test123!'
    });
    authToken = response.body.accessToken;
    // Seed test data
    await seedTestData();
});
(0, vitest_1.afterAll)(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
});
(0, vitest_1.describe)('Analytics API Integration', () => {
    (0, vitest_1.describe)('GET /api/analytics/kpi', () => {
        (0, vitest_1.it)('should return KPIs with valid token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/kpi?period=30d')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('revenue');
            (0, vitest_1.expect)(response.body.revenue).toHaveProperty('current');
            (0, vitest_1.expect)(response.body.revenue).toHaveProperty('previous');
            (0, vitest_1.expect)(response.body.revenue).toHaveProperty('changePercent');
            (0, vitest_1.expect)(response.body.revenue).toHaveProperty('trend');
        });
        (0, vitest_1.it)('should return 401 without token', async () => {
            await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/kpi?period=30d')
                .expect(401);
        });
        (0, vitest_1.it)('should validate period parameter', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/kpi?period=invalid')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
            (0, vitest_1.expect)(response.body.error).toContain('Validation failed');
        });
        (0, vitest_1.it)('should use cache on subsequent requests', async () => {
            const start1 = Date.now();
            await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/kpi?period=30d')
                .set('Authorization', `Bearer ${authToken}`);
            const duration1 = Date.now() - start1;
            const start2 = Date.now();
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/kpi?period=30d')
                .set('Authorization', `Bearer ${authToken}`);
            const duration2 = Date.now() - start2;
            (0, vitest_1.expect)(response.headers['x-cache']).toBe('HIT');
            (0, vitest_1.expect)(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
        });
    });
    (0, vitest_1.describe)('GET /api/analytics/revenue/overview', () => {
        (0, vitest_1.it)('should return monthly revenue breakdown', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/analytics/revenue/overview?period=90d')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('monthly');
            (0, vitest_1.expect)(Array.isArray(response.body.monthly)).toBe(true);
            (0, vitest_1.expect)(response.body).toHaveProperty('total');
            (0, vitest_1.expect)(response.body).toHaveProperty('average');
            (0, vitest_1.expect)(response.body).toHaveProperty('peak');
        });
    });
});
async function seedTestData() {
    // Create test customers, orders, tickets
    const customers = await Promise.all(Array.from({ length: 50 }).map(() => prisma.customer.create({
        data: {
            firstName: faker_1.faker.person.firstName(),
            lastName: faker_1.faker.person.lastName(),
            email: faker_1.faker.internet.email(),
            phone: faker_1.faker.phone.number(),
            location: faker_1.faker.location.city()
        }
    })));
    // Create orders for past 90 days
    for (const customer of customers) {
        const orderCount = faker_1.faker.number.int({ min: 1, max: 5 });
        for (let i = 0; i < orderCount; i++) {
            const purchaseDate = faker_1.faker.date.recent({ days: 90 });
            await prisma.order.create({
                data: {
                    orderNumber: `TEST-${Date.now()}-${faker_1.faker.number.int({ max: 9999 })}`,
                    customerId: customer.id,
                    quantity: faker_1.faker.number.int({ min: 1, max: 5 }),
                    amount: faker_1.faker.number.int({ min: 5000, max: 50000 }),
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
//# sourceMappingURL=analytics.integration.test.js.map