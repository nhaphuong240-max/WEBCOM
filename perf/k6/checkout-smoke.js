import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API_URL || 'https://webecom.ngoinhahomnay.vn/api';
const TENANT = __ENV.TENANT_ID || 'ten_aura';
const SF = __ENV.STOREFRONT_ID || 'sf_aura';

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const headers = {
    'content-type': 'application/json',
    'x-tenant-id': TENANT,
    'x-actor-id': 'k6',
  };
  const cart = http.post(`${API}/v1/carts`, JSON.stringify({ storefront_id: SF }), { headers });
  check(cart, { 'cart create': (r) => r.status === 201 || r.status === 200 });
  sleep(0.5);
}
