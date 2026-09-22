import { OrderClient } from './OrderClient';
import { getRuntime } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function OrderPage() {
  let ux: Awaited<ReturnType<typeof getRuntime>>['commerce_ux'] = null;
  try {
    ux = (await getRuntime()).commerce_ux;
  } catch {
    /* offline */
  }

  return (
    <OrderClient
      thankYouMessage={ux?.thank_you?.message}
      thankYouCtaLabel={ux?.thank_you?.cta_label}
      thankYouCtaHref={ux?.thank_you?.cta_href}
      showCart={ux?.show_cart !== false}
      showCartCount={ux?.show_cart_count !== false}
      floating={ux?.floating || []}
      headerCta={ux?.header_cta || null}
    />
  );
}
