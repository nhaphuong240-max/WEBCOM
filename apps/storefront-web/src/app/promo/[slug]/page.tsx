import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { SectionStack } from '../../../components/sections/SectionStack';
import { AddToCartButton } from '../../../components/AddToCartButton';
import { formatVnd, getPage, getProducts, getRuntime } from '../../../lib/api';
import { normalizeContent } from '../../../lib/normalize-content';
import { parseCampaignEnd } from '../../../components/CountdownBlock';

export const dynamic = 'force-dynamic';

function scheduleState(seo: Record<string, unknown> | undefined) {
  const start = seo?.schedule_start ? parseCampaignEnd(String(seo.schedule_start)) : NaN;
  const end = seo?.schedule_end ? parseCampaignEnd(String(seo.schedule_end)) : NaN;
  const now = Date.now();
  if (Number.isFinite(start) && now < start) return 'upcoming' as const;
  if (Number.isFinite(end) && now > end) return 'ended' as const;
  return 'live' as const;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPage(slug);
    const seo = page.seo || {};
    return {
      title: seo.title || page.title,
      description: seo.description || undefined,
    };
  } catch {
    return { title: slug };
  }
}

export default async function PromoLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let page;
  let runtime;
  try {
    [page, runtime] = await Promise.all([getPage(slug), getRuntime()]);
  } catch {
    notFound();
  }

  if (page.template_key && page.template_key !== 'landing_promo' && page.template_key !== 'landing') {
    /* allow landing + landing_promo */
  }

  const content = normalizeContent((page.content as Record<string, unknown>) || {});
  const seo = (page.seo || {}) as Record<string, unknown>;
  const state = scheduleState(seo);
  const ux = runtime.commerce_ux;
  const accent = runtime.brand_kit?.colors?.accent || '#c45a6a';
  const cream = runtime.brand_kit?.colors?.cream || '#faf6f4';
  const ink = runtime.brand_kit?.colors?.ink || '#1a1214';
  const headerLinks = Array.isArray(runtime.navigation?.header)
    ? (runtime.navigation.header as Array<{ label: string; href: string }>)
    : [];
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];

  const products = await getProducts({ sort: 'newest' }).catch(() => []);
  const limitNode = Object.values(content.sections || {}).find((s) => s.type === 'product_grid');
  const limit = Math.max(1, Math.min(24, Number(limitNode?.props?.limit) || 8));
  const list = products.slice(0, limit);

  const productsSlot = (
    <section
      style={{
        padding: '14px clamp(14px, 3vw, 48px)',
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      }}
    >
      {list.map((p) => {
        const sku = p.skus[0];
        return (
          <article
            key={p.id}
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid rgba(26,18,20,0.06)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Link href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  height: 140,
                  background: `linear-gradient(145deg,#2a1c1e,#c4a090), url(${p.media[0]?.url || ''}) center/cover`,
                }}
              />
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 16 }}>{p.title}</div>
                <div style={{ marginTop: 4, color: accent, fontWeight: 700, fontSize: 14 }}>
                  {formatVnd(sku?.unit_price)}
                </div>
              </div>
            </Link>
            <div style={{ padding: '0 12px 12px', marginTop: 'auto' }}>
              {sku && ux?.show_cart !== false ? (
                <AddToCartButton skuId={sku.id} disabled={(sku.available ?? 0) < 1} />
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={cream}
      ink={ink}
      headerLinks={headerLinks}
      bottomLinks={bottomLinks}
      showCart={ux?.show_cart !== false}
      showCartCount={ux?.show_cart_count !== false}
      showMiniCart={ux?.show_mini_cart !== false}
      miniCart={ux?.mini_cart || null}
      headerCta={ux?.header_cta || null}
      announcement={ux?.announcement || null}
      floating={ux?.floating || []}
    >
      {state === 'upcoming' ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Sắp mở</h1>
          <p style={{ color: '#6b5559' }}>
            Campaign chưa bắt đầu
            {seo.schedule_start ? ` · từ ${String(seo.schedule_start)}` : ''}.
          </p>
        </div>
      ) : null}

      {state === 'ended' ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Đã kết thúc</h1>
          <p style={{ color: '#6b5559' }}>Chiến dịch này không còn hiệu lực.</p>
          <Link href="/">Về trang chủ</Link>
        </div>
      ) : null}

      {state === 'live' ? (
        content.section_order.length ? (
          <SectionStack content={content} accent={accent} productsSlot={productsSlot} />
        ) : (
          <section style={{ padding: 24 }}>
            <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28 }}>{page.title}</h1>
          </section>
        )
      ) : null}
    </StoreShell>
  );
}
