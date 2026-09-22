'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '../lib/cart';
import { formatVnd } from '../lib/api';

export function MiniCart({
  enabled = true,
  title = 'Giỏ hàng',
  checkoutLabel = 'Thanh toán',
  continueLabel = 'Tiếp tục mua',
  accent = '#c45a6a',
}: {
  enabled?: boolean;
  title?: string;
  checkoutLabel?: string;
  continueLabel?: string;
  accent?: string;
}) {
  const { cart, refresh, qty } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onOpen = () => {
      void refresh();
      setOpen(true);
    };
    window.addEventListener('ptt:mini-cart-open', onOpen);
    return () => window.removeEventListener('ptt:mini-cart-open', onOpen);
  }, [enabled, refresh]);

  if (!enabled || !open) return null;

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(26,18,20,0.35)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setOpen(false)}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(360px, 100%)',
          height: '100%',
          background: '#faf6f4',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 20 }}>
            {title}
            {qty > 0 ? ` (${qty})` : ''}
          </strong>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
          {!cart || cart.lines.length === 0 ? (
            <p style={{ color: '#6b5559', fontSize: 14 }}>Chưa có sản phẩm.</p>
          ) : (
            cart.lines.map((l) => (
              <div
                key={l.id}
                style={{
                  background: '#fff',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid rgba(26,18,20,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: '#6b5559' }}>× {l.qty}</div>
                </div>
                <strong style={{ color: accent, fontSize: 14 }}>{formatVnd(l.line_total)}</strong>
              </div>
            ))
          )}
        </div>

        {cart && cart.lines.length > 0 ? (
          <div style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
            <span>Tạm tính</span>
            <span>{formatVnd(cart.total)}</span>
          </div>
        ) : null}

        <Link
          href="/checkout"
          onClick={() => setOpen(false)}
          style={{
            display: 'grid',
            placeItems: 'center',
            height: 44,
            borderRadius: 10,
            background: accent,
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {checkoutLabel}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            height: 40,
            borderRadius: 10,
            border: '1px solid rgba(26,18,20,0.12)',
            background: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {continueLabel}
        </button>
        <Link
          href="/cart"
          onClick={() => setOpen(false)}
          style={{ fontSize: 12, textAlign: 'center', color: '#6b5559' }}
        >
          Xem giỏ đầy đủ
        </Link>
      </aside>
    </div>
  );
}

export function openMiniCart() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ptt:mini-cart-open'));
  }
}
