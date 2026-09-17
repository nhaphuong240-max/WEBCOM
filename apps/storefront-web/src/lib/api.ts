const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura';
export const BRAND_ID = process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura';
export const STOREFRONT_ID = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

export async function storeApi<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': TENANT_ID,
    'x-brand-id': BRAND_ID,
    'x-actor-id': 'storefront',
    ...(init?.headers as Record<string, string>),
  };
  if (init?.idempotencyKey) headers['idempotency-key'] = init.idempotencyKey;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `API ${res.status}`);
  }
  return data as T;
}
