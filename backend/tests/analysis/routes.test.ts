// tests/analytics/routes.test.ts
import request from 'supertest';
import app from '../../app';

describe('Analytics API', () => {
  it('GET /api/analytics/kpi returns 200 with valid token', async () => {
    const response = await request(app)
      .get('/api/analytics/kpi?period=30d')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('revenue');
  });
  
  it('GET /api/analytics/kpi returns 401 without token', async () => {
    const response = await request(app)
      .get('/api/analytics/kpi');
    
    expect(response.status).toBe(401);
  });
});