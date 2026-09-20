/**
 * CORP-CMS — dual-path fetch for Platform CMS published / preview pages.
 */

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') ||
  process.env.INTERNAL_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3001';

export const PLATFORM_SITE_KEY =
  process.env.NEXT_PUBLIC_PLATFORM_SITE_KEY?.trim() || 'webcom_apex';

export function isPlatformCmsEnabled(): boolean {
  const raw = process.env.FEATURE_PLATFORM_CMS;
  if (raw === undefined) return false;
  return raw === '1' || raw === 'true';
}

export type PlatformContentV1 = {
  schema_version: number;
  section_order: string[];
  sections: Record<
    string,
    { type: string; id: string; props: Record<string, unknown>; style?: Record<string, unknown> }
  >;
};

export type PlatformPublishedPage = {
  site_key: string;
  slug: string;
  path: string;
  title: string;
  template_key: string;
  status: string;
  version: number;
  schema_version: number;
  content_v1?: PlatformContentV1;
  content?: unknown;
  seo?: unknown;
  preview?: boolean;
};

export async function fetchPlatformPage(
  slug: string,
  opts?: { siteKey?: string; previewToken?: string },
): Promise<PlatformPublishedPage | null> {
  const siteKey = opts?.siteKey || PLATFORM_SITE_KEY;
  const pathSlug = slug === '/' || slug === '' ? 'home' : slug.replace(/^\//, '');

  if (opts?.previewToken) {
    const url = `${API}/api/v1/public/platform/${encodeURIComponent(siteKey)}/preview?token=${encodeURIComponent(opts.previewToken)}&slug=${encodeURIComponent(pathSlug)}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.json()) as PlatformPublishedPage;
    } catch {
      return null;
    }
  }

  if (!isPlatformCmsEnabled()) return null;
  const url = `${API}/api/v1/public/platform/${encodeURIComponent(siteKey)}/pages/${encodeURIComponent(pathSlug)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: [`platform:${siteKey}`, `platform:${siteKey}:${pathSlug}`] },
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[platform-cms] public GET failed', res.status, url);
      return null;
    }
    return (await res.json()) as PlatformPublishedPage;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[platform-cms] fetch error', err);
    return null;
  }
}

export type PlatformNavItem = { label: string; href: string };

export async function fetchPlatformNav(
  siteKey = PLATFORM_SITE_KEY,
): Promise<{ header: PlatformNavItem[]; footer: PlatformNavItem[] }> {
  const fallback = {
    header: [
      { label: 'Website bán hàng', href: '/templates?goal=conversion' },
      { label: 'Beauty & Live', href: '/templates?industry=beauty' },
      { label: 'Solutions', href: '/solutions/website' },
      { label: 'Resources', href: '/resources' },
      { label: 'Tour', href: '/tour' },
      { label: 'Case studies', href: '/case-studies' },
    ],
    footer: [
      { label: 'Templates', href: '/templates' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Resources', href: '/resources' },
      { label: 'Trial', href: '/trial' },
    ],
  };
  try {
    const res = await fetch(
      `${API}/api/v1/public/platform/${encodeURIComponent(siteKey)}/nav`,
      { next: { revalidate: 60, tags: [`platform:${siteKey}:nav`] } },
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as Record<string, unknown>;
    const header = Array.isArray(data.header) ? (data.header as PlatformNavItem[]) : fallback.header;
    const footer = Array.isArray(data.footer) ? (data.footer as PlatformNavItem[]) : fallback.footer;
    return {
      header: header.length ? header : fallback.header,
      footer: footer.length ? footer : fallback.footer,
    };
  } catch {
    return fallback;
  }
}
