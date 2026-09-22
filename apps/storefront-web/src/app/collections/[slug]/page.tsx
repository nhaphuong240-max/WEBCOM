import Link from 'next/link';
import { StoreShell } from '../../../components/StoreShell';
import { AddToCartButton } from '../../../components/AddToCartButton';
import { formatVnd, getPage, getProducts, getRuntime } from '../../../lib/api';

export const dynamic = 'force-dynamic';

const SORTS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá ↑' },
  { key: 'price_desc', label: 'Giá ↓' },
] as const;

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; in_stock?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const runtime = await getRuntime();
  const ux = runtime.commerce_ux;
  const defaultSort = ux?.plp_default_sort || 'newest';
  const sort =
    SORTS.some((s) => s.key === sp.sort) ? (sp.sort as (typeof SORTS)[number]['key']) : defaultSort;
  const filters = new Set(ux?.plp_filters_enabled || ['in_stock', 'price']);
  const inStockOnly = sp.in_stock === '1' || sp.in_stock === 'true';

  const [products, merch] = await Promise.all([
    getProducts({ collection: slug, sort }),
    getPage(`collection--${slug}`).catch(() => null),
  ]);

  const title =
    ((runtime.theme.config as { collections?: Array<{ slug: string; title: string }> })?.collections || [])
      .find((c) => c.slug === slug)?.title ||
    merch?.title ||
    slug;

  const accent =
    runtime.brand_kit?.colors?.accent ||
    runtime.brand_kit?.colors?.rose ||
    '#c45a6a';
  const cream =
    runtime.brand_kit?.colors?.cream ||
    runtime.brand_kit?.colors?.surface ||
    '#faf6f4';
  const ink = runtime.brand_kit?.colors?.ink || '#1a1214';
  const headerLinks = Array.isArray(runtime.navigation?.header)
    ? (runtime.navigation.header as Array<{ label: string; href: string }>)
    : [];
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];

  const soldOut = ux?.sold_out_behavior || 'badge';
  let list = products;
  if (soldOut === 'hide' || inStockOnly) {
    list = list.filter((p) => (p.skus[0]?.available ?? 0) > 0);
  }

  const showPrice = ux?.catalog_card?.show_price !== false;
  const quickAdd =
    ux?.show_cart !== false && ux?.catalog_card?.primary_cta === 'add_to_cart';

  const merchContent = (merch?.content || {}) as {
    hero?: { headline?: string; sub?: string; banner_url?: string };
    banner?: { title?: string; image_url?: string; href?: string };
    sections?: Record<string, { type?: string; props?: Record<string, unknown> }>;
  };
  const bannerFromSections = Object.values(merchContent.sections || {}).find(
    (s) => s.type === 'promo_banner' || s.type === 'hero' || s.type === 'cta_banner',
  )?.props;
  const bannerTitle =
    merchContent.banner?.title ||
    merchContent.hero?.headline ||
    (bannerFromSections?.title as string) ||
    (bannerFromSections?.headline as string) ||
    '';
  const bannerImage =
    merchContent.banner?.image_url ||
    merchContent.hero?.banner_url ||
    (bannerFromSections?.banner_url as string) ||
    (bannerFromSections?.image_url as string) ||
    '';
  const bannerSub =
    merchContent.hero?.sub || (bannerFromSections?.sub as string) || (bannerFromSections?.body as string) || '';

  function hrefFor(next: { sort?: string; in_stock?: boolean }) {
    const q = new URLSearchParams();
    const s = next.sort ?? sort;
    if (s && s !== defaultSort) q.set('sort', s);
    const stock = next.in_stock ?? inStockOnly;
    if (stock) q.set('in_stock', '1');
    const qs = q.toString();
    return `/collections/${slug}${qs ? `?${qs}` : ''}`;
  }

  return (
    <StoreShell
      accent={accent}
      cream={cream}
      ink={ink}
      headerLinks={headerLinks}
      bottomLinks={bottomLinks}
      showCart={ux?.show_cart !== false}
      showCartCount={ux?.show_cart_count !== false}
      headerCta={ux?.header_cta || null}
      announcement={ux?.announcement || null}
      floating={ux?.floating || []}
    >
      {bannerTitle || bannerImage ? (
        <div
          style={{
            position: 'relative',
            minHeight: bannerImage ? 140 : 72,
            padding: '28px 16px',
            background: bannerImage
              ? `linear-gradient(180deg,rgba(26,18,20,0.45),rgba(26,18,20,0.55)), url(${bannerImage}) center/cover`
              : `linear-gradient(135deg, ${accent}22, ${cream})`,
            color: bannerImage ? '#fff' : ink,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--ptt-font-display)',
              fontSize: 28,
              letterSpacing: '-0.03em',
            }}
          >
            {bannerTitle || title}
          </h1>
          {bannerSub ? (
            <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.9, maxWidth: 420 }}>{bannerSub}</p>
          ) : null}
        </div>
      ) : (
        <div style={{ padding: '20px 16px 0' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>{title}</h1>
        </div>
      )}

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Link
                key={s.key}
                href={hrefFor({ sort: s.key })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: active ? '#fff' : ink,
                  background: active ? accent : '#fff',
                  border: `1px solid ${active ? accent : 'rgba(26,18,20,0.1)'}`,
                }}
              >
                {s.label}
              </Link>
            );
          })}
          {filters.has('in_stock') ? (
            <Link
              href={hrefFor({ in_stock: !inStockOnly })}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                color: inStockOnly ? '#fff' : ink,
                background: inStockOnly ? '#2a7a4b' : '#fff',
                border: `1px solid ${inStockOnly ? '#2a7a4b' : 'rgba(26,18,20,0.1)'}`,
              }}
            >
              Còn hàng
            </Link>
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {list.map((p) => {
            const sku = p.skus[0];
            const avail = (sku?.available ?? 0) > 0;
            const listPrice = sku?.list_price ? Number(sku.list_price) : null;
            const unit = sku?.unit_price != null ? Number(sku.unit_price) : null;
            const showCompare =
              ux?.show_compare_at_price !== false &&
              listPrice != null &&
              unit != null &&
              listPrice > unit;
            return (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid rgba(26,18,20,0.06)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <Link
                  href={`/products/${p.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <strong style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 17 }}>
                    {p.title}
                  </strong>
                  {!avail && soldOut !== 'hide' ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#9a3a3a',
                      }}
                    >
                      Hết hàng
                    </span>
                  ) : null}
                  {showPrice ? (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ color: accent, fontWeight: 700 }}>{formatVnd(sku?.unit_price)}</span>
                      {showCompare ? (
                        <span
                          style={{
                            textDecoration: 'line-through',
                            color: '#6b5559',
                            fontSize: 13,
                          }}
                        >
                          {formatVnd(sku?.list_price)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
                {quickAdd && sku ? (
                  <AddToCartButton skuId={sku.id} disabled={!avail} label="Thêm giỏ" />
                ) : null}
              </div>
            );
          })}
          {list.length === 0 ? (
            <p style={{ color: '#6b5559' }}>Chưa có SP khớp bộ lọc — thử Serum trên home.</p>
          ) : null}
        </div>
      </div>
    </StoreShell>
  );
}
