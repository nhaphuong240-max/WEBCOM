const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura';
export const BRAND_ID = process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura';
export const STOREFRONT_ID = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  media: Array<{ url: string; alt: string }>;
  skus: Array<{
    id: string;
    code: string;
    variant_title?: string;
    unit_price: string | null;
    list_price?: string | null;
    discount_percent?: number | null;
    available: number;
    currency: string;
  }>;
  min_price?: string | null;
};

export type Runtime = {
  storefront: {
    id: string;
    name: string;
    slug: string;
    status: string;
    seo_title?: string | null;
    seo_description?: string | null;
    gtm_container_id?: string | null;
    meta_pixel_id?: string | null;
  };
  theme: { code: string; name: string; version: number; config: Record<string, unknown> };
  navigation: Record<string, unknown>;
  home: { title: string; content: Record<string, unknown>; seo: Record<string, unknown> } | null;
};

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
    next: init?.cache === 'no-store' ? undefined : { revalidate: 30 },
    cache: init?.cache ?? 'force-cache',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `API ${res.status}`);
  return data as T;
}

export async function getRuntime() {
  return storeApi<Runtime>(`/v1/storefronts/${STOREFRONT_ID}/runtime`, { cache: 'no-store' });
}

export async function getProducts(query?: {
  q?: string;
  collection?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();
  if (query?.q) params.set('q', query.q);
  if (query?.collection) params.set('collection', query.collection);
  if (query?.sort) params.set('sort', query.sort);
  const qs = params.toString();
  return storeApi<Product[]>(`/v1/catalog/products${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
}

export async function getProduct(slug: string) {
  return storeApi<Product>(`/v1/catalog/products/${slug}`, { cache: 'no-store' });
}

export function formatVnd(n: string | number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('vi-VN').format(v) + '₫';
}
