const API_BASE =
  (typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || process.env.ADMIN_API_URL
    : undefined)?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3001';

const ENV_TENANT = process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura';
const ENV_BRAND = process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura';
const ENV_STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

/** Env fallbacks — client components use these; SSR prefers host-resolved context. */
export const TENANT_ID = ENV_TENANT;
export const BRAND_ID = ENV_BRAND;
export const STOREFRONT_ID = ENV_STOREFRONT;

export async function getStoreContext() {
  if (typeof window === 'undefined') {
    try {
      // Dynamic import so client bundles (cart/analytics) never pull next/headers.
      const { headers } = await import('next/headers');
      const h = await headers();
      return {
        tenantId: h.get('x-ptt-tenant-id') || ENV_TENANT,
        brandId: h.get('x-ptt-brand-id') || ENV_BRAND,
        storefrontId: h.get('x-ptt-storefront-id') || ENV_STOREFRONT,
      };
    } catch {
      /* outside request / build */
    }
  }
  return { tenantId: ENV_TENANT, brandId: ENV_BRAND, storefrontId: ENV_STOREFRONT };
}

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
  brand_kit?: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    logo?: { url?: string; alt?: string };
    voice?: { cta_default?: string };
  } | null;
};

export async function storeApi<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const ctx = await getStoreContext();
  const headersMap: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': ctx.tenantId,
    'x-brand-id': ctx.brandId,
    'x-actor-id': 'storefront',
    ...(init?.headers as Record<string, string>),
  };
  if (init?.idempotencyKey) headersMap['idempotency-key'] = init.idempotencyKey;

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: headersMap,
    next: init?.cache === 'no-store' ? undefined : { revalidate: 30 },
    cache: init?.cache ?? 'force-cache',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `API ${res.status}`);
  return data as T;
}

export async function getRuntime(preview?: string) {
  const { storefrontId } = await getStoreContext();
  const q = preview ? `?preview=${encodeURIComponent(preview)}` : '';
  return storeApi<Runtime>(`/v1/storefronts/${storefrontId}/runtime${q}`, { cache: 'no-store' });
}

export async function getPage(slug: string) {
  const { storefrontId } = await getStoreContext();
  return storeApi<{
    slug: string;
    title: string;
    content: Record<string, unknown>;
    seo: Record<string, unknown>;
  }>(`/v1/storefronts/${storefrontId}/pages/${slug}`, { cache: 'no-store' });
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

export async function searchProducts(query?: {
  q?: string;
  collection?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();
  if (query?.q) params.set('q', query.q);
  if (query?.collection) params.set('collection', query.collection);
  if (query?.sort) params.set('sort', query.sort);
  const qs = params.toString();
  return storeApi<{
    items: Product[];
    meta: {
      source: string;
      latency_ms: number;
      engine: string;
      count: number;
      within_slo?: boolean;
    };
    total_ms?: number;
  }>(`/v1/catalog/search${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
}

export async function getProduct(slug: string) {
  return storeApi<Product>(`/v1/catalog/products/${slug}`, { cache: 'no-store' });
}

export function formatVnd(n: string | number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('vi-VN').format(v) + '₫';
}
