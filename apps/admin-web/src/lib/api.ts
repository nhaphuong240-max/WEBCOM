export const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura';
export const BRAND_ID = process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura';

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': TENANT_ID,
      'x-brand-id': BRAND_ID,
      'x-actor-id': 'admin_ui',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiJson<T>(
  path: string,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return apiGet<T>(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: extraHeaders,
  });
}
