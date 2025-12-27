"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/unit/services/ticket.service.test.ts
const vitest_1 = require("vitest");
const ticket_service_1 = require("../../../src/modules/tickets/ticket.service");
const vitest_mock_extended_1 = require("vitest-mock-extended");
const prismaMock = (0, vitest_mock_extended_1.mockDeep)();
vitest_1.vi.mock('../../../src/config/database', () => ({
    default: prismaMock
}));
(0, vitest_1.describe)('TicketService', () => {
    let ticketService;
    (0, vitest_1.beforeEach)(() => {
        (0, vitest_mock_extended_1.mockReset)(prismaMock);
        ticketService = new ticket_service_1.TicketService();
    });
    (0, vitest_1.describe)('validateTicket', () => {
        (0, vitest_1.it)('should return valid for active ticket within validity period', async () => {
            const mockTicket = {
                id: '1',
                ticketCode: 'JGPNR-2024-ABC123',
                status: 'ACTIVE',
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                scanCount: 0,
                maxScans: 2,
                firstScanAt: null
            };
            prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);
            const result = await ticketService.validateTicket({
                ticketCode: 'JGPNR-2024-ABC123'
            });
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.reason).toContain('Valid');
            (0, vitest_1.expect)(result.remainingScans).toBe(2);
        });
        (0, vitest_1.it)('should return invalid for expired ticket', async () => {
            const mockTicket = {
                id: '1',
                ticketCode: 'JGPNR-2024-ABC123',
                status: 'ACTIVE',
                validUntil: new Date(Date.now() - 1000), // Expired
                scanCount: 0,
                maxScans: 2
            };
            prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);
            const result = await ticketService.validateTicket({
                ticketCode: 'JGPNR-2024-ABC123'
            });
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('expired');
        });
        (0, vitest_1.it)('should return invalid when max scans reached', async () => {
            const mockTicket = {
                id: '1',
                ticketCode: 'JGPNR-2024-ABC123',
                status: 'ACTIVE',
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                scanCount: 2,
                maxScans: 2
            };
            prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);
            const result = await ticketService.validateTicket({
                ticketCode: 'JGPNR-2024-ABC123'
            });
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.reason).toContain('Maximum scan limit');
        });
    });
    (0, vitest_1.describe)('scanTicket', () => {
        (0, vitest_1.it)('should increment scan count on successful scan', async () => {
            // Test implementation
        });
        (0, vitest_1.it)('should set status to SCANNED when reaching max scans', async () => {
            // Test implementation
        });
        (0, vitest_1.it)('should record scan history regardless of validation result', async () => {
            // Test implementation
        });
    });
});
//# sourceMappingURL=ticket.service.test.js.map