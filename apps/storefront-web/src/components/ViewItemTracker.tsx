'use client';

import { useEffect } from 'react';
import { trackEvent } from '../lib/analytics';

export function ViewItemTracker({
  productId,
  skuId,
}: {
  storefrontId?: string;
  productId: string;
  skuId?: string;
}) {
  useEffect(() => {
    void trackEvent({
      name: 'view_item',
      payload: { product_id: productId, sku_id: skuId },
    });
  }, [productId, skuId]);
  return null;
}
