"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tests/analytics/routes.test.ts
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Analytics API', () => {
    it('GET /api/analytics/kpi returns 200 with valid token', async () => {
        const response = await (0, supertest_1.default)(app_1.default)
            .get('/api/analytics/kpi?period=30d')
            .set('Authorization', `Bearer ${validToken}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('revenue');
    });
    it('GET /api/analytics/kpi returns 401 without token', async () => {
        const response = await (0, supertest_1.default)(app_1.default)
            .get('/api/analytics/kpi');
        expect(response.status).toBe(401);
    });
});
//# sourceMappingURL=routes.test.js.map