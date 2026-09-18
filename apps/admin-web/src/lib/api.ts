import { cookies } from 'next/headers';

export const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura';
export const BRAND_ID = process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura';
export const STOREFRONT_ID = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

export type AdminSession = {
  accessToken?: string;
  tenantId: string;
  brandId: string;
  storefrontId: string;
  actorId: string;
};

export async function getAdminSession(): Promise<AdminSession> {
  const jar = await cookies();
  const accessToken = jar.get('ptt_access_token')?.value;
  return {
    accessToken,
    tenantId: jar.get('ptt_tenant_id')?.value || TENANT_ID,
    brandId: jar.get('ptt_brand_id')?.value || BRAND_ID,
    storefrontId: jar.get('ptt_storefront_id')?.value || STOREFRONT_ID,
    actorId: jar.get('ptt_actor_id')?.value || 'admin_ui',
  };
}

export async function getSessionStorefrontId(): Promise<string> {
  const s = await getAdminSession();
  return s.storefrontId;
}

function sessionHeaders(session: AdminSession): Record<string, string> {
  if (session.accessToken) {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${session.accessToken}`,
      'x-tenant-id': session.tenantId,
      'x-brand-id': session.brandId,
      'x-actor-id': session.actorId,
    };
  }
  return {
    'content-type': 'application/json',
    'x-tenant-id': session.tenantId,
    'x-brand-id': session.brandId,
    'x-actor-id': session.actorId,
  };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getAdminSession();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      ...sessionHeaders(session),
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
