'use client';

import { useEffect } from 'react';
import { storeApi } from '../lib/api';

export function ViewItemTracker({
  storefrontId,
  productId,
  skuId,
}: {
  storefrontId: string;
  productId: string;
  skuId?: string;
}) {
  useEffect(() => {
    void storeApi('/v1/events', {
      method: 'POST',
      cache: 'no-store',
      body: JSON.stringify({
        storefront_id: storefrontId,
        name: 'view_item',
        payload: { product_id: productId, sku_id: skuId },
      }),
    }).catch(() => undefined);
  }, [storefrontId, productId, skuId]);
  return null;
}
