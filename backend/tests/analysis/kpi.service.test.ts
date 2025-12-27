// tests/analytics/kpi.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { KPIService } from '../kpi.service';

describe('KPIService', () => {
  let service: KPIService;
  
  beforeEach(() => {
    service = new KPIService();
  });
  
  it('calculates revenue KPI correctly', async () => {
    const result = await service.getDashboardKPIs('30d');
    
    expect(result.revenue).toMatchObject({
      current: expect.any(Number),
      previous: expect.any(Number),
      change: expect.any(Number),
      changePercent: expect.any(Number),
      trend: expect.stringMatching(/up|down|stable/),
    });
  });
  
  it('handles zero previous period revenue', async () => {
    // Test edge case
  });
});