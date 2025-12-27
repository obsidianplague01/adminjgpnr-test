"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/analytics/kpi.service.test.ts
const vitest_1 = require("vitest");
const kpi_service_1 = require("../kpi.service");
(0, vitest_1.describe)('KPIService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new kpi_service_1.KPIService();
    });
    (0, vitest_1.it)('calculates revenue KPI correctly', async () => {
        const result = await service.getDashboardKPIs('30d');
        (0, vitest_1.expect)(result.revenue).toMatchObject({
            current: vitest_1.expect.any(Number),
            previous: vitest_1.expect.any(Number),
            change: vitest_1.expect.any(Number),
            changePercent: vitest_1.expect.any(Number),
            trend: vitest_1.expect.stringMatching(/up|down|stable/),
        });
    });
    (0, vitest_1.it)('handles zero previous period revenue', async () => {
        // Test edge case
    });
});
//# sourceMappingURL=kpi.service.test.js.map