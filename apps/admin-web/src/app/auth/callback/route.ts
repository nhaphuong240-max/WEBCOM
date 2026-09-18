import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get('access_token');
  const tenantId = sp.get('tenant_id');
  if (!token || !tenantId) {
    return NextResponse.redirect(new URL('/login?error=missing_token', req.url));
  }

  const nextPath = sp.get('next')?.startsWith('/') ? sp.get('next')! : '/website/onboarding';
  const res = NextResponse.redirect(new URL(nextPath, req.url));
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
