import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'https://webecom.ngoinhahomnay.vn';
const TENANT = __ENV.TENANT_ID || 'ten_aura';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const headers = { 'x-tenant-id': TENANT, 'x-actor-id': 'k6' };
  const home = http.get(`${BASE}/`, { headers });
  check(home, { 'home 200': (r) => r.status === 200 });

  const pdp = http.get(`${BASE}/products/glow-serum-30ml`, { headers });
  check(pdp, { 'pdp 200': (r) => r.status === 200 });

  const health = http.get(`${BASE}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  sleep(1);
}
