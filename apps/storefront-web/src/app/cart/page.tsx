import Link from 'next/link';
import { StoreShell } from '../../components/StoreShell';
import { CartClient } from './CartClient';
import { getProducts, getRuntime } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  let ux: Awaited<ReturnType<typeof getRuntime>>['commerce_ux'] = null;
  let crossSell: Array<{ id: string; title: string; slug: string; price: string | null }> = [];
  try {
    const runtime = await getRuntime();
    ux = runtime.commerce_ux;
    const limit = Math.max(0, Math.min(8, ux?.cart_cross_sell?.limit ?? 4));
    if (limit > 0) {
      const products = await getProducts({ sort: 'newest' });
      crossSell = products.slice(0, limit).map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: p.skus[0]?.unit_price ?? p.min_price ?? null,
      }));
    }
  } catch {
    /* demo offline */
  }

  const accent = '#c45a6a';

  if (ux?.is_lead_gen || ux?.show_cart === false) {
    return (
      <StoreShell
        showCart={false}
        floating={ux?.floating || []}
        headerCta={ux?.header_cta || null}
      >
        <div style={{ padding: 16 }}>
          <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28 }}>Giỏ hàng</h1>
          <p style={{ color: '#6b5559' }}>
            {ux?.empty_cart?.title || 'Chế độ tư vấn — không dùng giỏ hàng.'}
          </p>
          <Link href={ux?.empty_cart?.cta_href || '/'}>
            {ux?.empty_cart?.cta_label || 'Về trang chủ'}
          </Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell
      showCart
      showCartCount={ux?.show_cart_count !== false}
      showMiniCart={ux?.show_mini_cart !== false}
      miniCart={ux?.mini_cart || null}
      floating={ux?.floating || []}
      headerCta={ux?.header_cta || null}
      announcement={ux?.announcement || null}
      accent={accent}
    >
      <CartClient
        emptyTitle={ux?.empty_cart?.title}
        emptyCtaLabel={ux?.empty_cart?.cta_label}
        emptyCtaHref={ux?.empty_cart?.cta_href}
        showCoupon={ux?.coupon_entry_cart !== false}
        couponPlaceholder={ux?.coupon_placeholder}
        policyLinks={ux?.checkout_policy_links}
        trustBadges={ux?.cart_trust_badges}
        crossSellTitle={ux?.cart_cross_sell?.title}
        crossSell={crossSell}
        freeShippingThreshold={ux?.free_shipping_threshold ?? null}
        accent={accent}
      />
    </StoreShell>
  );
}
