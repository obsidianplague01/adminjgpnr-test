// tests/performance/load/analytics-load.k6.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const analyticsLatency = new Trend('analytics_latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm-up
    { duration: '1m', target: 50 },    // Normal load
    { duration: '1m', target: 100 },   // Peak load
    { duration: '1m', target: 200 },   // Stress test
    { duration: '30s', target: 0 }     // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% < 1s, 99% < 2s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.05'],                           // Custom error rate < 5%
    analytics_latency: ['p(95)<800']                 // Analytics 95% < 800ms
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TOKEN = __ENV.AUTH_TOKEN;

export default function() {
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  group('Analytics Endpoints', () => {
    // KPI Dashboard
    group('KPI Dashboard', () => {
      const res1 = http.get(`${BASE_URL}/api/analytics/kpi?period=30d`, params);
      analyticsLatency.add(res1.timings.duration);
      check(res1, {
        'KPI status 200': (r) => r.status === 200,
        'KPI has revenue': (r) => JSON.parse(r.body).revenue !== undefined,
        'KPI response time < 1s': (r) => r.timings.duration < 1000
      }) || errorRate.add(1);
    });

    // Revenue Overview
    group('Revenue Overview', () => {
      const res2 = http.get(`${BASE_URL}/api/analytics/revenue/overview?period=90d`, params);
      analyticsLatency.add(res2.timings.duration);
      check(res2, {
        'Revenue status 200': (r) => r.status === 200,
        'Revenue has monthly data': (r) => Array.isArray(JSON.parse(r.body).monthly),
        'Revenue response time < 1.5s': (r) => r.timings.duration < 1500
      }) || errorRate.add(1);
    });

    // Session Distribution (cached)
    group('Session Distribution', () => {
      const res3 = http.get(`${BASE_URL}/api/analytics/sessions/distribution?period=30d`, params);
      analyticsLatency.add(res3.timings.duration);
      check(res3, {
        'Sessions status 200': (r) => r.status === 200,
        'Sessions cached': (r) => r.headers['X-Cache'] === 'HIT' || r.headers['X-Cache'] === 'MISS'
      }) || errorRate.add(1);
    });
  });

  sleep(1);
}
