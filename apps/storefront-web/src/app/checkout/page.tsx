'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreShell } from '../../components/StoreShell';
import { useCart } from '../../lib/cart';
import { formatVnd, storeApi, STOREFRONT_ID } from '../../lib/api';

type Quote = { carrier: string; service: string; eta_days: number; amount: string };

export default function CheckoutPage() {
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
    void storeApi<Quote[]>('/v1/shipping/quotes?city=HCM', { cache: 'no-store' }).then(setQuotes);
  }, [refresh]);

  const shipping = Number(quotes.find((q) => q.carrier === shipCarrier)?.amount ?? 0);
  const subtotal = Number(cart?.subtotal ?? cart?.total ?? 0);
  const total = Math.max(0, subtotal - discount) + shipping;

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
        const key = `w2-${cart.id}-${Date.now()}`;
        const order = await storeApi<{ order_id: string }>('/v1/checkout', {
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
            note: `carrier=${shipCarrier};voucher=${voucher || 'none'};pay=${pay}`,
            client_total: 1,
          }),
        });
        void storeApi('/v1/events', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            storefront_id: STOREFRONT_ID,
            name: 'begin_checkout',
            session_id: typeof window !== 'undefined' ? localStorage.getItem('ptt_session_v1') : undefined,
            landing_path: '/checkout',
            consent_state:
              typeof window !== 'undefined'
                ? localStorage.getItem('ptt_consent_v1') || 'unknown'
                : 'unknown',
            payload: { cart_id: cart.id },
          }),
        }).catch(() => undefined);
        void storeApi('/v1/events', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            storefront_id: STOREFRONT_ID,
            name: 'purchase',
            session_id: typeof window !== 'undefined' ? localStorage.getItem('ptt_session_v1') : undefined,
            landing_path: '/',
            consent_state: 'granted',
            payload: { order_id: order.order_id, total },
          }),
        }).catch(() => undefined);
        clearLocal();
        router.push(`/order/${order.order_id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
      }
    });
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <StoreShell>
        <div style={{ padding: 16 }}>
          <p>
            Giỏ trống. <Link href="/">Về trang chủ</Link>
          </p>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Checkout</h1>
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Vận chuyển</div>
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

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Voucher (AURA10)"
            value={voucher}
            onChange={(e) => setVoucher(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={applyVoucher} style={btnGhost}>
            Áp dụng
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Thanh toán</div>
          <label style={{ display: 'block', marginBottom: 6 }}>
            <input type="radio" checked={pay === 'COD'} onChange={() => setPay('COD')} /> COD
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" checked={pay === 'QR'} onChange={() => setPay('QR')} /> QR / chuyển khoản
            (stub)
          </label>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 12, fontSize: 14 }}>
          <Row label="Tạm tính" value={formatVnd(subtotal)} />
          <Row label="Giảm giá" value={`- ${formatVnd(discount)}`} />
          <Row label="Ship" value={formatVnd(shipping)} />
          <Row label="Tổng (ước tính UI)" value={formatVnd(total)} bold />
          <p style={{ fontSize: 11, color: '#6b5559', margin: '8px 0 0' }}>
            Order total do server tính lại (BR-021).
          </p>
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
          {pending ? 'Đang xử lý…' : pay === 'COD' ? 'Đặt hàng COD' : 'Đặt hàng + QR'}
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
