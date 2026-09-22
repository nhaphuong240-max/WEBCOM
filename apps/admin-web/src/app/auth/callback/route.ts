import { NextRequest, NextResponse } from 'next/server';

/** Public console origin incl. basePath, never the Node listen address. */
function consoleBase(req: NextRequest): string {
  const fromEnv = (
    process.env.ADMIN_WEB_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_CONSOLE_URL ||
    ''
  ).replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const basePath = (process.env.NEXT_BASE_PATH || '').replace(/\/$/, '');
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (req.nextUrl.protocol || 'https:').replace(':', '') ||
    'https';
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host') ||
    '';
  const internal =
    !host ||
    /^127\./.test(host) ||
    /^localhost(?::|$)/i.test(host) ||
    /^0\.0\.0\.0(?::|$)/.test(host) ||
    /^\[::1\](?::|$)/.test(host);

  if (internal) {
    return `https://webecom.ngoinhahomnay.vn${basePath}`;
  }
  return `${proto}://${host}${basePath}`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get('access_token');
  const tenantId = sp.get('tenant_id');
  if (!token || !tenantId) {
    return NextResponse.redirect(`${consoleBase(req)}/login?error=missing_token`);
  }

  const nextPath = sp.get('next')?.startsWith('/') ? sp.get('next')! : '/website/onboarding';
  const res = NextResponse.redirect(`${consoleBase(req)}${nextPath}`);
  const maxAge = 60 * 60 * 12;
  const secure = process.env.NODE_ENV === 'production';
  const common = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge, secure };

  res.cookies.set('ptt_access_token', token, common);
  res.cookies.set('ptt_tenant_id', tenantId, common);
  const brandId = sp.get('brand_id');
  const storefrontId = sp.get('storefront_id');
  const actorId = sp.get('actor_id');
  if (brandId) res.cookies.set('ptt_brand_id', brandId, common);
  if (storefrontId) res.cookies.set('ptt_storefront_id', storefrontId, common);
  if (actorId) res.cookies.set('ptt_actor_id', actorId, common);

  return res;
}
