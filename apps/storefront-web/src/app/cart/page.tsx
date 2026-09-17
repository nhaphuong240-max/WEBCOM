'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StoreShell } from '../../components/StoreShell';
import { useCart } from '../../lib/cart';
import { formatVnd } from '../../lib/api';

export default function CartPage() {
  const { cart, refresh, qty } = useCart();
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <StoreShell>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28, marginTop: 8 }}>Giỏ hàng</h1>
        {!cart || cart.lines.length === 0 ? (
          <p style={{ color: '#6b5559' }}>
            Chưa có sản phẩm. <Link href="/">Tiếp tục mua</Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {cart.lines.map((l) => (
              <div
                key={l.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid rgba(26,18,20,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>{l.title}</strong>
                  <div style={{ fontSize: 13, color: '#6b5559' }}>× {l.qty}</div>
                </div>
                <strong style={{ color: '#c45a6a' }}>{formatVnd(l.line_total)}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
              <span>Tổng ({qty})</span>
              <span>{formatVnd(cart.total)}</span>
            </div>
            <p style={{ fontSize: 12, color: '#6b5559' }}>Giá do server tính — không tin client total.</p>
            <Link
              href="/checkout"
              style={{
                display: 'grid',
                placeItems: 'center',
                height: 48,
                background: '#1a1214',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Thanh toán
            </Link>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
