import Link from 'next/link';
import { StoreShell } from '../../components/StoreShell';
import { CartClient } from './CartClient';
import { getRuntime } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  let ux: Awaited<ReturnType<typeof getRuntime>>['commerce_ux'] = null;
  try {
    const runtime = await getRuntime();
    ux = runtime.commerce_ux;
  } catch {
    /* demo offline */
  }

  if (ux?.is_lead_gen || ux?.show_cart === false) {
    return (
      <StoreShell showCart={false} floating={ux?.floating || []} headerCta={ux?.header_cta || null}>
        <div style={{ padding: 16 }}>
          <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28 }}>Giỏ hàng</h1>
          <p style={{ color: '#6b5559' }}>{ux?.empty_cart?.title || 'Chế độ tư vấn — không dùng giỏ hàng.'}</p>
          <Link href={ux?.empty_cart?.cta_href || '/'}>{ux?.empty_cart?.cta_label || 'Về trang chủ'}</Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell
      showCart
      showCartCount={ux?.show_cart_count !== false}
      floating={ux?.floating || []}
      headerCta={ux?.header_cta || null}
      announcement={ux?.announcement || null}
    >
      <CartClient
        emptyTitle={ux?.empty_cart?.title}
        emptyCtaLabel={ux?.empty_cart?.cta_label}
        emptyCtaHref={ux?.empty_cart?.cta_href}
        showCoupon={ux?.coupon_entry_cart}
        policyLinks={ux?.checkout_policy_links}
      />
    </StoreShell>
  );
}
