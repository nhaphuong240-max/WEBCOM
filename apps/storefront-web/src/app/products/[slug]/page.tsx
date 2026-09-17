import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { AddToCartButton } from '../../../components/AddToCartButton';
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
  const sku = product.skus[0];
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
      availability:
        (sku?.available ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
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

      <div
        style={{
          position: 'relative',
          height: 'min(72vw, 360px)',
          minHeight: 280,
          background: `linear-gradient(165deg,#1a1514,#3d2c28 40%,#c4a090), url(${product.media[0]?.url || ''}) center/cover`,
        }}
      />

      <div style={{ padding: 16, paddingBottom: 88 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#c45a6a',
              background: 'rgba(196,90,106,0.12)',
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            Best seller
          </span>
          <span style={{ fontSize: 11, color: '#6b5559', padding: '4px 0' }}>
            {(sku?.available ?? 0) > 0 ? `Còn ${sku?.available}` : 'Hết hàng'}
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 28,
            letterSpacing: '-0.03em',
          }}
        >
          {product.title}
        </h1>
        <p style={{ color: '#6b5559', fontSize: 14 }}>{product.description}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '12px 0' }}>
          <strong style={{ fontSize: 22, color: '#c45a6a' }}>{formatVnd(sku?.unit_price)}</strong>
          {sku?.list_price && sku.list_price !== sku.unit_price ? (
            <span style={{ textDecoration: 'line-through', color: '#6b5559', fontSize: 14 }}>
              {formatVnd(sku.list_price)}
            </span>
          ) : null}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phiên bản</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {product.skus.map((s) => (
              <span
                key={s.id}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #c45a6a',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {s.variant_title || s.code}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['COD toàn quốc', 'Đổi trả 7 ngày', 'Chat Zalo'].map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                padding: '6px 10px',
                borderRadius: 8,
                background: '#fff',
                border: '1px solid rgba(26,18,20,0.08)',
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Có thể bạn thích</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {related
            .filter((r) => r.id !== product.id)
            .slice(0, 3)
            .map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.slug}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 12,
                  background: '#fff',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid rgba(26,18,20,0.06)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.title}</span>
                <span style={{ color: '#c45a6a' }}>{formatVnd(r.skus[0]?.unit_price)}</span>
              </Link>
            ))}
        </div>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 56,
          zIndex: 45,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(250,246,244,0.96)',
          borderTop: '1px solid rgba(26,18,20,0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#6b5559' }}>Giá thành viên</div>
          <strong style={{ color: '#c45a6a' }}>{formatVnd(sku?.unit_price)}</strong>
        </div>
        {sku ? (
          <div style={{ flex: 1.2 }}>
            <AddToCartButton skuId={sku.id} disabled={(sku.available ?? 0) < 1} />
          </div>
        ) : null}
      </div>
    </StoreShell>
  );
}
