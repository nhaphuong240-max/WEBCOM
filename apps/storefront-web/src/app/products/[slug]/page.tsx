import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { ProductHero, TrustGrid } from '../../../components/ProductHero';
import { StickyAtcBar } from '../../../components/StickyAtcBar';
import { formatVnd, getProduct, getProducts, getRuntime, STOREFRONT_ID } from '../../../lib/api';
import { ViewItemTracker } from '../../../components/ViewItemTracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getProduct(slug);
    return {
      title: `${p.title} | AURA Beauty`,
      description: p.description,
      openGraph: { title: p.title, description: p.description },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }
  const [runtime, related] = await Promise.all([getRuntime(), getProducts()]);
  const ux = runtime.commerce_ux;
  const sku = product.skus[0];
  const accent =
    runtime.brand_kit?.colors?.accent ||
    runtime.brand_kit?.colors?.rose ||
    '#c45a6a';
  const cream =
    runtime.brand_kit?.colors?.cream ||
    runtime.brand_kit?.colors?.surface ||
    '#faf6f4';
  const ink = runtime.brand_kit?.colors?.ink || '#1a1214';
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];
  const headerLinks = Array.isArray(runtime.navigation?.header)
    ? (runtime.navigation.header as Array<{ label: string; href: string }>)
    : [];
  const inStock = (sku?.available ?? 0) > 0;
  const showCompare = ux?.show_compare_at_price !== false;
  const listPrice = sku?.list_price ? Number(sku.list_price) : null;
  const unitPrice = sku?.unit_price != null ? Number(sku.unit_price) : null;
  const save =
    showCompare && listPrice != null && unitPrice != null && listPrice > unitPrice
      ? listPrice - unitPrice
      : null;
  const relatedLimit = Math.max(1, Math.min(12, ux?.related_limit ?? 4));
  const stickyEnabled = ux?.show_cart !== false && ux?.sticky_atc_mobile !== false;
  const soldOut = ux?.sold_out_behavior || 'badge';
  const showAtc = ux?.show_cart !== false && ux?.catalog_card?.primary_cta !== 'view_detail';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.media.map((m) => m.url),
    sku: sku?.code,
    offers: {
      '@type': 'Offer',
      priceCurrency: sku?.currency || 'VND',
      price: sku?.unit_price,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewItemTracker
        storefrontId={STOREFRONT_ID}
        productId={product.id}
        skuId={sku?.id}
      />

      <ProductHero
        brandLabel="AURA"
        productLabel={sku?.variant_title || 'Night Repair'}
        photoUrl={product.media[0]?.url}
        showBottle={!product.media[0]?.url}
      />

      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: accent,
              background: `${accent}1f`,
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            Bán chạy
          </span>
          {!inStock && soldOut !== 'hide' ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9a3a3a',
                background: 'rgba(154,58,58,0.12)',
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              {soldOut === 'waitlist' ? 'Chờ hàng' : 'Hết hàng'}
            </span>
          ) : null}
          {sku?.variant_title ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#6b5559',
                background: 'rgba(26,18,20,0.06)',
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              {sku.variant_title}
            </span>
          ) : null}
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 26,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}
        >
          {product.title}
        </h1>
        {product.description ? (
          <p style={{ color: '#6b5559', fontSize: 14, margin: '8px 0 0', lineHeight: 1.5 }}>
            {product.description}
          </p>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '14px 0 4px' }}>
          <strong style={{ fontSize: 24, color: accent, fontFamily: 'var(--ptt-font-display)' }}>
            {formatVnd(sku?.unit_price)}
          </strong>
          {listPrice != null && save != null ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#6b5559', fontSize: 14 }}>
                {formatVnd(sku?.list_price)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2a7a4b' }}>
                Tiết kiệm {formatVnd(save)}
              </span>
            </>
          ) : null}
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b5559' }}>
          Giá <strong style={{ color: ink }}>thành viên AURA</strong>
          {showCompare && listPrice != null ? ` · Giá khách ${formatVnd(sku?.list_price)}` : null}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: inStock ? '#2a7a4b' : '#9a3a3a',
            }}
            aria-hidden
          />
          <span style={{ fontWeight: 600 }}>{inStock ? 'Còn hàng' : 'Hết hàng'}</span>
          <span style={{ color: '#6b5559', fontWeight: 500 }}>· Giao HCM trong 24h</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#6b5559' }}>
            Phiên bản
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {product.skus.map((s, i) => {
              const avail = (s.available ?? 0) > 0;
              return (
                <span
                  key={s.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${i === 0 ? accent : 'rgba(26,18,20,0.12)'}`,
                    background: i === 0 ? `${accent}12` : '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: avail ? 1 : 0.45,
                    color: ink,
                  }}
                >
                  {s.variant_title || s.code}
                  {!avail ? ' — hết' : ''}
                </span>
              );
            })}
          </div>
        </div>

        <TrustGrid
          items={[
            { title: 'Giao 24–48h', sub: 'Nội thành HN/HCM' },
            { title: 'COD', sub: 'Thanh toán khi nhận' },
            { title: 'Đổi 7 ngày', sub: 'Seal còn nguyên' },
          ]}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          <a
            href="https://zalo.me/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 42,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(26,18,20,0.12)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: ink,
              textDecoration: 'none',
              background: '#fff',
            }}
          >
            Nhắn Zalo
          </a>
          <a
            href="https://m.me/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 42,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(26,18,20,0.12)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: ink,
              textDecoration: 'none',
              background: '#fff',
            }}
          >
            Messenger
          </a>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 8px', fontFamily: 'var(--ptt-font-display)' }}>
            Về sản phẩm
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#6b5559', lineHeight: 1.55 }}>
            {product.description ||
              'Công thức tập trung phục hồi — thấm nhanh, phù hợp khí hậu Việt Nam.'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <h2 style={{ fontSize: 15, margin: 0, fontFamily: 'var(--ptt-font-display)' }}>
            Mua kèm
          </h2>
          <Link href="/search" style={{ fontSize: 12, color: '#6b5559', textDecoration: 'none' }}>
            Xem tất cả
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {related
            .filter((r) => r.id !== product.id)
            .slice(0, relatedLimit)
            .map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.slug}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#fff',
                  border: '1px solid rgba(26,18,20,0.06)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: 100,
                    background: `linear-gradient(145deg,#2a1c1e,#c4a090), url(${r.media[0]?.url || ''}) center/cover`,
                  }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--ptt-font-display)',
                      fontSize: 14,
                      letterSpacing: '-0.02em',
                      marginBottom: 4,
                    }}
                  >
                    {r.title}
                  </div>
                  <div style={{ fontSize: 13, color: accent, fontWeight: 600 }}>
                    {formatVnd(r.skus[0]?.unit_price)}
                  </div>
                </div>
              </Link>
            ))}
        </div>

        <p
          style={{
            textAlign: 'center',
            padding: '8px 0 4px',
            fontSize: 10,
            color: '#6b5559',
            letterSpacing: '0.04em',
          }}
        >
          Powered by <strong style={{ color: ink }}>PTT</strong>
        </p>
      </div>

      {sku && showAtc ? (
        <StickyAtcBar
          skuId={sku.id}
          priceLabel={formatVnd(sku.unit_price)}
          inStock={inStock}
          enabled={stickyEnabled}
          accent={accent}
        />
      ) : null}
    </StoreShell>
  );
}
