import { CheckoutClient } from './CheckoutClient';
import { getRuntime } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  let ux: Awaited<ReturnType<typeof getRuntime>>['commerce_ux'] = null;
  try {
    ux = (await getRuntime()).commerce_ux;
  } catch {
    /* offline */
  }

  return (
    <CheckoutClient
      headline={ux?.checkout?.headline}
      codNote={ux?.checkout?.cod_note}
      guestHint={ux?.checkout?.guest_hint}
      showCoupon={ux?.coupon_entry_checkout !== false}
      couponPlaceholder={ux?.coupon_placeholder}
      policyLinks={ux?.checkout_policy_links || []}
      emptyTitle={ux?.empty_cart?.title}
      emptyCtaLabel={ux?.empty_cart?.cta_label}
      emptyCtaHref={ux?.empty_cart?.cta_href}
      showCart={ux?.show_cart !== false}
      showCartCount={ux?.show_cart_count !== false}
      showMiniCart={ux?.show_mini_cart !== false}
      miniCart={ux?.mini_cart || null}
      floating={ux?.floating || []}
      headerCta={ux?.header_cta || null}
      announcement={ux?.announcement || null}
    />
  );
}
