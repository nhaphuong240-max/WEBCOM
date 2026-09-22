'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreShell } from '../../components/StoreShell';
import { useCart } from '../../lib/cart';
import { formatVnd, storeApi, STOREFRONT_ID } from '../../lib/api';

type Quote = {
  carrier: string;
  service: string;
  eta_days: number;
  amount: string;
  source?: 'live' | 'stub';
};

type CheckoutResult = {
  order_id: string;
  total: string;
  payment?: {
    intent_id: string | null;
    qr_image_url?: string | null;
    transfer_content?: string | null;
    status?: string;
  } | null;
};

export function CheckoutClient({
  headline = 'Thanh toán',
  codNote = '',
  guestHint = '',
  showCoupon = true,
  couponPlaceholder = 'Nhập mã giảm giá',
  policyLinks = [],
  emptyTitle = 'Giỏ hàng trống',
  emptyCtaLabel = 'Về trang chủ',
  emptyCtaHref = '/',
  showCart = true,
  showCartCount = true,
  showMiniCart = false,
  miniCart,
  floating,
  headerCta,
  announcement,
}: {
  headline?: string;
  codNote?: string;
  guestHint?: string;
  showCoupon?: boolean;
  couponPlaceholder?: string;
  policyLinks?: Array<{ label: string; href: string }>;
  emptyTitle?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
  showCart?: boolean;
  showCartCount?: boolean;
  showMiniCart?: boolean;
  miniCart?: { title?: string; checkout_label?: string; continue_label?: string } | null;
  floating?: Array<{ key: string; label: string; href: string; color1?: string }>;
  headerCta?: { label: string; href: string } | null;
  announcement?: { text: string; href: string } | null;
}) {
  const { cart, refresh, clearLocal } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [shipCarrier, setShipCarrier] = useState('GHN');
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [pay, setPay] = useState<'COD' | 'QR'>('COD');
  const [ship, setShip] = useState({
    name: '',
    phone: '',
    address: '',
    city: 'HCM',
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void storeApi<Quote[]>(`/v1/shipping/quotes?city=${encodeURIComponent(ship.city || 'HCM')}`, {
      cache: 'no-store',
    }).then((q) => {
      setQuotes(q);
      setShipCarrier((prev) => (q.find((x) => x.carrier === prev) ? prev : q[0]?.carrier || prev));
    });
  }, [ship.city]);

  const shipping = Number(quotes.find((q) => q.carrier === shipCarrier)?.amount ?? 0);
  const subtotal = Number(cart?.subtotal ?? cart?.total ?? 0);
  const total = Math.max(0, subtotal - discount) + shipping;
  const selected = quotes.find((q) => q.carrier === shipCarrier);

  function applyVoucher() {
    if (!cart || !voucher) return;
    start(async () => {
      try {
        const v = await storeApi<{ discount_amount: number }>('/v1/vouchers/validate', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            storefront_id: STOREFRONT_ID,
            code: voucher,
            subtotal,
          }),
        });
        setDiscount(v.discount_amount);
        setError('');
      } catch (e) {
        setDiscount(0);
        setError(e instanceof Error ? e.message : 'Voucher lỗi');
      }
    });
  }

  function submit() {
    if (!cart) return;
    start(async () => {
      try {
        setError('');
        const key = `a2-${cart.id}-${Date.now()}`;
        const order = await storeApi<CheckoutResult>('/v1/checkout', {
          method: 'POST',
          cache: 'no-store',
          idempotencyKey: key,
          body: JSON.stringify({
            cart_id: cart.id,
            payment_method: pay === 'QR' ? 'TRANSFER' : 'COD',
            shipping_name: ship.name,
            shipping_phone: ship.phone,
            shipping_address: ship.address,
            shipping_city: ship.city,
            shipping_carrier: shipCarrier,
            shipping_service: selected?.service,
            voucher_code: voucher || undefined,
            client_total: total,
          }),
        });
        void storeApi('/v1/events', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            storefront_id: STOREFRONT_ID,
            name: 'purchase',
            session_id:
              typeof window !== 'undefined' ? localStorage.getItem('ptt_session_v1') : undefined,
            landing_path: '/',
            consent_state: 'granted',
            payload: { order_id: order.order_id, total: order.total, pay },
          }),
        }).catch(() => undefined);
        clearLocal();
        router.push(`/order/${order.order_id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
      }
    });
  }

  const shell = {
    showCart,
    showCartCount,
    showMiniCart,
    miniCart,
    floating,
    headerCta,
    announcement,
  };

  if (!cart || cart.lines.length === 0) {
    return (
      <StoreShell {...shell}>
        <div style={{ padding: 16 }}>
          <p style={{ color: '#6b5559' }}>{emptyTitle}</p>
          <Link href={emptyCtaHref || '/'}>{emptyCtaLabel}</Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell {...shell}>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>{headline}</h1>
        {guestHint ? (
          <p style={{ margin: 0, fontSize: 13, color: '#6b5559' }}>{guestHint}</p>
        ) : null}
        {error ? <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p> : null}

        <input
          placeholder="Họ tên"
          value={ship.name}
          onChange={(e) => setShip((s) => ({ ...s, name: e.target.value }))}
          style={inputStyle}
        />
        <input
          placeholder="SĐT"
          value={ship.phone}
          onChange={(e) => setShip((s) => ({ ...s, phone: e.target.value }))}
          style={inputStyle}
        />
        <input
          placeholder="Địa chỉ"
          value={ship.address}
          onChange={(e) => setShip((s) => ({ ...s, address: e.target.value }))}
          style={inputStyle}
        />
        <input
          placeholder="Thành phố"
          value={ship.city}
          onChange={(e) => setShip((s) => ({ ...s, city: e.target.value }))}
          style={inputStyle}
        />

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Vận chuyển{' '}
            <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.7 }}>
              ({selected?.source === 'live' ? 'GHN live' : 'stub'})
            </span>
          </div>
          {quotes.map((q) => (
            <label
              key={q.carrier}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 10,
                background: shipCarrier === q.carrier ? 'rgba(196,90,106,0.1)' : '#fff',
                borderRadius: 8,
                marginBottom: 6,
                border: '1px solid rgba(26,18,20,0.08)',
              }}
            >
              <span>
                <input
                  type="radio"
                  checked={shipCarrier === q.carrier}
                  onChange={() => setShipCarrier(q.carrier)}
                />{' '}
                {q.carrier} · {q.service} · {q.eta_days} ngày
              </span>
              <strong>{formatVnd(q.amount)}</strong>
            </label>
          ))}
        </div>

        {showCoupon ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder={couponPlaceholder}
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={applyVoucher} style={btnGhost}>
              Áp dụng
            </button>
          </div>
        ) : null}

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Thanh toán</div>
          <label style={{ display: 'block', marginBottom: 6 }}>
            <input type="radio" checked={pay === 'COD'} onChange={() => setPay('COD')} /> COD
          </label>
          {pay === 'COD' && codNote ? (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b5559', paddingLeft: 22 }}>
              {codNote}
            </p>
          ) : null}
          <label style={{ display: 'block' }}>
            <input type="radio" checked={pay === 'QR'} onChange={() => setPay('QR')} /> VietQR /
            chuyển khoản
          </label>
        </div>

        {policyLinks.length ? (
          <ul style={{ fontSize: 12, color: '#6b5559', paddingLeft: 16, margin: 0 }}>
            {policyLinks.map((p) => (
              <li key={p.href}>
                <Link href={p.href}>{p.label}</Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div style={{ background: '#fff', borderRadius: 12, padding: 12, fontSize: 14 }}>
          <Row label="Tạm tính" value={formatVnd(subtotal)} />
          <Row label="Giảm giá" value={`- ${formatVnd(discount)}`} />
          <Row label="Ship" value={formatVnd(shipping)} />
          <Row label="Tổng (server sẽ tính lại)" value={formatVnd(total)} bold />
        </div>

        <button
          type="button"
          disabled={pending || !ship.name || !ship.phone || !ship.address}
          onClick={submit}
          style={{
            height: 48,
            border: 'none',
            borderRadius: 10,
            background: '#c45a6a',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {pending ? 'Đang xử lý…' : pay === 'COD' ? 'Đặt hàng COD' : 'Đặt hàng + VietQR'}
        </button>
      </div>
    </StoreShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        fontWeight: bold ? 800 : 500,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 8,
  border: '1px solid rgba(26,18,20,0.12)',
  padding: '0 12px',
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
};

const btnGhost: React.CSSProperties = {
  height: 44,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid rgba(26,18,20,0.15)',
  background: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};
