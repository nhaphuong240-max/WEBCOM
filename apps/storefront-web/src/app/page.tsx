import Link from 'next/link';
import { StoreShell } from '../components/StoreShell';
import { formatVnd, getProducts, getRuntime } from '../lib/api';
import { AddToCartButton } from '../components/AddToCartButton';
import { HeroBlock } from '../components/HeroBlock';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; demo?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [runtime, products] = await Promise.all([getRuntime(sp.preview), getProducts()]);
  const demoCode = sp.demo?.trim() || '';
  let demoName = '';
  if (demoCode) {
    try {
      const base =
        (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || '').replace(
          /\/$/,
          '',
        ) || 'http://127.0.0.1:3001';
      const res = await fetch(`${base}/api/v1/public/templates/${encodeURIComponent(demoCode)}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const t = (await res.json()) as { name?: string };
        demoName = t.name || demoCode;
      } else {
        demoName = demoCode;
      }
    } catch {
      demoName = demoCode;
    }
  }
  const hero = (runtime.home?.content as { hero?: Record<string, string> })?.hero;
  const trust = (runtime.home?.content as { trust?: string[] })?.trust ?? [
    'COD toàn quốc',
    'Đổi trả 7 ngày',
    'Hàng chính hãng',
  ];
  const collections =
    ((runtime.theme.config as { collections?: Array<{ slug: string; title: string }> })
      ?.collections) ?? [];
  const accent =
    runtime.brand_kit?.colors?.accent ||
    runtime.brand_kit?.colors?.rose ||
    (runtime.theme.config as { tokens?: { accent?: string } })?.tokens?.accent ||
    '#c45a6a';
  const cream =
    runtime.brand_kit?.colors?.cream ||
    runtime.brand_kit?.colors?.surface ||
    '#faf6f4';
  const ink = runtime.brand_kit?.colors?.ink || '#1a1214';

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={cream}
      ink={ink}
    >
      {demoCode ? (
        <div
          style={{
            padding: '10px 14px',
            background: '#0b1420',
            color: '#f4f7fb',
            fontSize: 13,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Đang xem demo template <strong>{demoName || demoCode}</strong> · trial trước khi mua theme
          </span>
          <span style={{ display: 'flex', gap: 12 }}>
            <a href="https://webecom.ngoinhahomnay.vn/templates" style={{ color: '#7dd3fc' }}>
              Catalog
            </a>
            <a
              href="https://webecom.ngoinhahomnay.vn/trial"
              style={{ color: '#7dd3fc' }}
            >
              Dùng thử
            </a>
          </span>
        </div>
      ) : null}
      <HeroBlock
        eyebrow={hero?.eyebrow || 'AURA Beauty'}
        headline={hero?.headline || 'Serum tái tạo da đêm'}
        cta={hero?.cta || 'Mua ngay'}
        ctaHref={hero?.cta_href || '/products/glow-serum-30ml'}
        accent={accent}
      />

      <div style={{ padding: '14px 14px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {collections.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            style={{
              whiteSpace: 'nowrap',
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid rgba(26,18,20,0.1)',
              background: '#fff',
              color: '#1a1214',
              fontSize: 13,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <section style={{ padding: 14, display: 'grid', gap: 12 }}>
        {products.map((p) => {
          const sku = p.skus[0];
          return (
            <article
              key={p.id}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid rgba(26,18,20,0.06)',
                overflow: 'hidden',
              }}
            >
              <Link href={`/products/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    height: 160,
                    background: `linear-gradient(145deg,#2a1c1e,#c4a090), url(${p.media[0]?.url || ''}) center/cover`,
                  }}
                />
                <div style={{ padding: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--ptt-font-display)' }}>
                    {p.title}
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b5559' }}>
                    Còn {sku?.available ?? 0} · {formatVnd(sku?.unit_price)}
                  </p>
                </div>
              </Link>
              <div style={{ padding: '0 14px 14px' }}>
                {sku ? <AddToCartButton skuId={sku.id} disabled={(sku.available ?? 0) < 1} /> : null}
              </div>
            </article>
          );
        })}
      </section>

      <section style={{ padding: '8px 14px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {trust.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(196,90,106,0.1)',
              color: '#c45a6a',
              fontWeight: 600,
            }}
          >
            {t}
          </span>
        ))}
      </section>
    </StoreShell>
  );
}
