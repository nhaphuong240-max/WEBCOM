import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE =
  (process.env.INTERNAL_API_URL || process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || '')
    .replace(/\/$/, '') || 'http://127.0.0.1:3001';

/**
 * A1 — resolve Host → tenant/storefront and inject request headers for SSR.
 * Falls back to env defaults when resolve fails (local / single-tenant).
 */
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const requestHeaders = new Headers(req.headers);

  const skip =
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local');

  if (!skip) {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/public/host-resolve?host=${encodeURIComponent(hostname)}`,
        { next: { revalidate: 30 } },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          tenant_id: string;
          brand_id: string;
          storefront_id: string;
          slug: string;
        };
        requestHeaders.set('x-ptt-tenant-id', data.tenant_id);
        requestHeaders.set('x-ptt-brand-id', data.brand_id);
        requestHeaders.set('x-ptt-storefront-id', data.storefront_id);
        requestHeaders.set('x-ptt-storefront-slug', data.slug);
        requestHeaders.set('x-ptt-host', hostname);
      }
    } catch {
      // keep env fallbacks
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)'],
};
