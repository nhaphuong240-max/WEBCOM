export type ShippingQuote = {
  carrier: string;
  service: string;
  eta_days: number;
  amount: string;
  source: 'live' | 'stub';
};

export function stubQuotes(city?: string): ShippingQuote[] {
  const c = (city || '').toLowerCase();
  const base =
    c.includes('hcm') ||
    c.includes('hồ chí minh') ||
    c.includes('ho chi minh') ||
    c.includes('saigon') ||
    c.includes('sài gòn')
      ? 25000
      : 35000;
  return [
    { carrier: 'GHN', service: 'Standard', eta_days: 2, amount: String(base), source: 'stub' },
    {
      carrier: 'GHTK',
      service: 'Economy',
      eta_days: 3,
      amount: String(Math.max(15000, base - 5000)),
      source: 'stub',
    },
    {
      carrier: 'ViettelPost',
      service: 'Express',
      eta_days: 1,
      amount: String(base + 15000),
      source: 'stub',
    },
  ];
}

/** Live GHN fee when FEATURE_LIVE_SHIPPING + GHN_TOKEN; otherwise stub matrix. */
export async function fetchGhnQuotes(city?: string): Promise<ShippingQuote[] | null> {
  const token = process.env.GHN_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;
  if (!token || !shopId) return null;

  const toDistrict = Number(process.env.GHN_TO_DISTRICT_ID || 1442);
  const fromDistrict = Number(process.env.GHN_FROM_DISTRICT_ID || 1454);
  const weight = Number(process.env.GHN_DEFAULT_WEIGHT_G || 500);

  try {
    const res = await fetch('https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: token,
        ShopId: shopId,
      },
      body: JSON.stringify({
        service_type_id: 2,
        insurance_value: 0,
        coupon: null,
        from_district_id: fromDistrict,
        to_district_id: toDistrict,
        weight,
        length: 20,
        width: 15,
        height: 10,
      }),
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4000) : undefined,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { total?: number }; code?: number };
    const total = data?.data?.total;
    if (!total || total <= 0) return null;
    const stubs = stubQuotes(city).filter((q) => q.carrier !== 'GHN');
    return [
      {
        carrier: 'GHN',
        service: 'Standard',
        eta_days: 2,
        amount: String(Math.round(total)),
        source: 'live',
      },
      ...stubs,
    ];
  } catch {
    return null;
  }
}
