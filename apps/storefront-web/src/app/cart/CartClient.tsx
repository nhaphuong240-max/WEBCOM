'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useCart } from '../../lib/cart';
import { formatVnd, storeApi, STOREFRONT_ID } from '../../lib/api';

type CrossSell = { id: string; title: string; slug: string; price: string | null };

export function CartClient({
  emptyTitle = 'Giỏ hàng trống',
  emptyCtaLabel = 'Tiếp tục mua sắm',
  emptyCtaHref = '/',
  showCoupon = true,
  couponPlaceholder = 'Nhập mã giảm giá',
  policyLinks = [],
  trustBadges = [],
  crossSellTitle = 'Có thể bạn thích',
  crossSell = [],
  freeShippingThreshold = null,
  accent = '#c45a6a',
}: {
  emptyTitle?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
  showCoupon?: boolean;
  couponPlaceholder?: string;
  policyLinks?: Array<{ label: string; href: string }>;
  trustBadges?: string[];
  crossSellTitle?: string;
  crossSell?: CrossSell[];
  freeShippingThreshold?: number | null;
  accent?: string;
}) {
  const { cart, refresh, qty } = useCart();
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subtotal = Number(cart?.total ?? 0);
  const freeshipLeft =
    freeShippingThreshold != null && freeShippingThreshold > 0
      ? Math.max(0, freeShippingThreshold - subtotal)
      : null;

  function applyCoupon() {
    if (!cart || !voucher.trim()) return;
    start(async () => {
      try {
        const v = await storeApi<{ discount_amount: number }>('/v1/vouchers/validate', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            storefront_id: STOREFRONT_ID,
            code: voucher.trim(),
            subtotal,
          }),
        });
        setDiscount(v.discount_amount);
        setCouponMsg(`Đã áp dụng −${formatVnd(v.discount_amount)}`);
      } catch (e) {
        setDiscount(0);
        setCouponMsg(e instanceof Error ? e.message : 'Mã không hợp lệ');
      }
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28, marginTop: 8 }}>Giỏ hàng</h1>
      {!cart || cart.lines.length === 0 ? (
        <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
          <p style={{ color: '#6b5559', margin: 0 }}>{emptyTitle}</p>
          <Link
            href={emptyCtaHref || '/'}
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              height: 44,
              maxWidth: 240,
              background: accent,
              color: '#fff',
              borderRadius: 10,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {emptyCtaLabel}
          </Link>
          {crossSell.length ? (
            <CrossSellBlock title={crossSellTitle} items={crossSell} accent={accent} />
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {freeshipLeft != null ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                padding: '10px 12px',
                borderRadius: 8,
                background: freeshipLeft === 0 ? 'rgba(42,122,75,0.1)' : 'rgba(196,90,106,0.1)',
                color: freeshipLeft === 0 ? '#2a7a4b' : '#6b5559',
              }}
            >
              {freeshipLeft === 0
                ? 'Đơn đủ điều kiện freeship'
                : `Mua thêm ${formatVnd(freeshipLeft)} để freeship`}
            </p>
          ) : null}

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
              <strong style={{ color: accent }}>{formatVnd(l.line_total)}</strong>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>Tạm tính ({qty})</span>
            <span>{formatVnd(cart.total)}</span>
          </div>
          {discount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#2a7a4b' }}>
              <span>Giảm giá</span>
              <span>−{formatVnd(discount)}</span>
            </div>
          ) : null}

          {showCoupon ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={voucher}
                onChange={(e) => setVoucher(e.target.value)}
                placeholder={couponPlaceholder}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid rgba(26,18,20,0.12)',
                  padding: '0 12px',
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={applyCoupon}
                style={{
                  height: 40,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(26,18,20,0.15)',
                  background: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Áp dụng
              </button>
            </div>
          ) : null}
          {couponMsg ? <p style={{ margin: 0, fontSize: 12, color: '#6b5559' }}>{couponMsg}</p> : null}

          {trustBadges.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {trustBadges.map((b) => (
                <span
                  key={b}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(26,18,20,0.06)',
                    color: '#6b5559',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}

          {policyLinks?.length ? (
            <ul style={{ fontSize: 12, color: '#6b5559', paddingLeft: 16, margin: 0 }}>
              {policyLinks.map((p) => (
                <li key={p.href}>
                  <Link href={p.href}>{p.label}</Link>
                </li>
              ))}
            </ul>
          ) : null}

          <p style={{ fontSize: 12, color: '#6b5559', margin: 0 }}>
            Giá do server tính lại khi checkout — CMS không sửa số tiền.
          </p>

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

          {crossSell.length ? (
            <CrossSellBlock title={crossSellTitle} items={crossSell} accent={accent} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function CrossSellBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: CrossSell[];
  accent: string;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <h2 style={{ fontSize: 15, fontFamily: 'var(--ptt-font-display)', margin: '0 0 8px' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
              borderRadius: 10,
              padding: 12,
              border: '1px solid rgba(26,18,20,0.06)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
            {p.price != null ? (
              <div style={{ fontSize: 13, color: accent, fontWeight: 700 }}>{formatVnd(p.price)}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
