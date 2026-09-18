import Link from 'next/link';
import { StoreShell } from '../components/StoreShell';
import { formatVnd, getProducts, getRuntime } from '../lib/api';
import { AddToCartButton } from '../components/AddToCartButton';
import { HeroBlock } from '../components/HeroBlock';
import { SectionStack } from '../components/sections/SectionStack';
import { loadDemoPackage } from '../lib/demo-package';
import { normalizeContent } from '../lib/normalize-content';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; demo?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const demoCode = sp.demo?.trim() || '';
  const [runtime, products, demoPkg] = await Promise.all([
    getRuntime(sp.preview),
    getProducts(),
    demoCode ? loadDemoPackage(demoCode) : Promise.resolve(null),
  ]);

  const pageContent = demoPkg
    ? demoPkg.content_v1
    : normalizeContent((runtime.home?.content as Record<string, unknown>) || {});

  const collections =
    ((runtime.theme.config as { collections?: Array<{ slug: string; title: string }> })
      ?.collections) ?? [];

  const accent =
    demoPkg?.tokens.accent ||
    runtime.brand_kit?.colors?.accent ||
    runtime.brand_kit?.colors?.rose ||
    (runtime.theme.config as { tokens?: { accent?: string } })?.tokens?.accent ||
    '#c45a6a';
  const cream =
    demoPkg?.tokens.cream ||
    runtime.brand_kit?.colors?.cream ||
    runtime.brand_kit?.colors?.surface ||
    '#faf6f4';
  const ink =
    demoPkg?.tokens.ink || runtime.brand_kit?.colors?.ink || '#1a1214';

  const productsSlot = (
    <section
      style={{
        padding: '14px clamp(14px, 3vw, 48px)',
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      }}
    >
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
              display: 'flex',
              flexDirection: 'column',
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
            <div style={{ padding: '0 14px 14px', marginTop: 'auto' }}>
              {sku ? <AddToCartButton skuId={sku.id} disabled={(sku.available ?? 0) < 1} /> : null}
            </div>
          </article>
        );
      })}
    </section>
  );

  const hasSections = pageContent.section_order.length > 0;
  const experimentCode =
    !demoCode && runtime.home && 'experiment_code' in (runtime.home as object)
      ? ((runtime.home as { experiment_code?: string | null }).experiment_code ?? null)
      : null;
  const headerLinks = Array.isArray(runtime.navigation?.header)
    ? (runtime.navigation.header as Array<{ label: string; href: string }>)
    : [];
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];

  return (
    <StoreShell
      brand={demoPkg?.name?.split(' ')[0] || 'AURA'}
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={cream}
      ink={ink}
      headerLinks={headerLinks}
      bottomLinks={bottomLinks}
    >
      {demoCode ? (
        <p
          style={{
            margin: 0,
            padding: '8px 14px',
            fontSize: 12,
            color: '#6b5559',
            background: 'rgba(26,18,20,0.04)',
          }}
        >
          Demo template <strong>{demoPkg?.name || demoCode}</strong>
          {demoPkg ? ' · package resolve' : ''}
        </p>
      ) : null}

      {hasSections ? (
        <SectionStack
          content={pageContent}
          accent={accent}
          collections={collections}
          productsSlot={productsSlot}
          experimentCode={experimentCode}
        />
      ) : (
        <>
          <HeroBlock
            eyebrow="AURA Beauty"
            headline="Serum tái tạo da đêm"
            cta="Mua ngay"
            ctaHref="/products/glow-serum-30ml"
            accent={accent}
            experimentCode={experimentCode}
          />
          {productsSlot}
        </>
      )}
    </StoreShell>
  );
}
