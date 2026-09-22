'use client';

import { AddToCartButton } from './AddToCartButton';

export function StickyAtcBar({
  skuId,
  priceLabel,
  inStock,
  enabled = true,
  accent = '#c45a6a',
}: {
  skuId: string;
  priceLabel: string;
  inStock: boolean;
  enabled?: boolean;
  accent?: string;
}) {
  if (!enabled) {
    return (
      <div style={{ padding: '0 16px 24px' }}>
        <AddToCartButton skuId={skuId} disabled={!inStock} />
      </div>
    );
  }

  return (
    <div
      className="pdp-sticky-atc"
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
      <div style={{ flex: '0 0 auto', minWidth: 88 }}>
        <div style={{ fontSize: 10, color: '#6b5559' }}>Giá</div>
        <strong
          style={{
            color: accent,
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 18,
            letterSpacing: '-0.02em',
          }}
        >
          {priceLabel}
        </strong>
      </div>
      <div style={{ flex: 1 }}>
        <AddToCartButton skuId={skuId} disabled={!inStock} />
      </div>
    </div>
  );
}
