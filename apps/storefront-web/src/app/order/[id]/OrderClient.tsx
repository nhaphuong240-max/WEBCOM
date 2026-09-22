'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { formatVnd, storeApi } from '../../../lib/api';

type Order = {
  id: string;
  status: string;
  total: string;
  payment_method: string;
  payment_status: string;
  discount?: string;
  shipping_amount?: string;
  voucher_code?: string | null;
  shipping?: { carrier?: string | null; service?: string | null };
  lines: Array<{ title: string; qty: number; line_total: string }>;
};

type Payment = {
  intent_id: string;
  status: string;
  qr_image_url?: string | null;
  transfer_content?: string | null;
  amount?: string;
} | null;

export function OrderClient({
  thankYouMessage = 'Cảm ơn bạn đã đặt hàng! Chúng tôi sẽ liên hệ xác nhận sớm.',
  thankYouCtaLabel = 'Tiếp tục mua sắm',
  thankYouCtaHref = '/',
  showCart = true,
  showCartCount = true,
  floating,
  headerCta,
}: {
  thankYouMessage?: string;
  thankYouCtaLabel?: string;
  thankYouCtaHref?: string;
  showCart?: boolean;
  showCartCount?: boolean;
  floating?: Array<{ key: string; label: string; href: string; color1?: string }>;
  headerCta?: { label: string; href: string } | null;
}) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    try {
      const o = await storeApi<Order>(`/v1/orders/${id}`, { cache: 'no-store' });
      setOrder(o);
      if (o.payment_method === 'TRANSFER') {
        const p = await storeApi<Payment>(`/v1/orders/${id}/payment`, { cache: 'no-store' });
        setPayment(p);
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not found');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order || order.payment_method !== 'TRANSFER' || order.payment_status === 'paid') return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [order, load]);

  function simulatePaid() {
    if (!payment?.intent_id) return;
    start(async () => {
      try {
        await storeApi(`/v1/payments/intents/${payment.intent_id}/simulate-paid`, {
          method: 'POST',
          cache: 'no-store',
          body: '{}',
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Simulate failed');
      }
    });
  }

  return (
    <StoreShell
      showCart={showCart}
      showCartCount={showCartCount}
      floating={floating}
      headerCta={headerCta}
    >
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Đơn hàng</h1>
        {order && !error ? (
          <p style={{ color: '#6b5559', fontSize: 14, lineHeight: 1.5 }}>{thankYouMessage}</p>
        ) : null}
        {error || !order ? (
          <p style={{ color: 'crimson' }}>{error || 'Không tìm thấy'}</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#6b5559' }}>
              <code>{order.id}</code>
            </p>
            <p>
              <strong>{order.status}</strong> · {order.payment_method} ·{' '}
              <strong>{order.payment_status}</strong> · {formatVnd(order.total)}
            </p>
            {order.shipping?.carrier ? (
              <p style={{ fontSize: 13 }}>
                Ship: {order.shipping.carrier} {order.shipping.service} ·{' '}
                {formatVnd(order.shipping_amount)}
              </p>
            ) : null}
            {order.voucher_code ? (
              <p style={{ fontSize: 13 }}>
                Voucher {order.voucher_code}: −{formatVnd(order.discount)}
              </p>
            ) : null}
            <ul style={{ paddingLeft: 18 }}>
              {order.lines.map((l, i) => (
                <li key={i}>
                  {l.title} × {l.qty} — {formatVnd(l.line_total)}
                </li>
              ))}
            </ul>

            {order.payment_method === 'TRANSFER' ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'rgba(196,90,106,0.08)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                {order.payment_status === 'paid' ? (
                  <strong>Đã thanh toán VietQR</strong>
                ) : (
                  <>
                    <strong>Quét VietQR để thanh toán</strong>
                    {payment?.transfer_content ? (
                      <p style={{ margin: '8px 0' }}>
                        Nội dung CK: <code>{payment.transfer_content}</code>
                      </p>
                    ) : null}
                    {payment?.qr_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={payment.qr_image_url}
                        alt="VietQR"
                        width={220}
                        height={220}
                        style={{ display: 'block', margin: '8px 0', background: '#fff' }}
                      />
                    ) : (
                      <p>Đang tạo QR…</p>
                    )}
                    <button
                      type="button"
                      disabled={pending || !payment?.intent_id}
                      onClick={simulatePaid}
                      style={{
                        marginTop: 8,
                        height: 36,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(26,18,20,0.15)',
                        background: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {pending ? '…' : 'Simulate paid (dev)'}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
        <p style={{ marginTop: 16 }}>
          <Link
            href={thankYouCtaHref || '/'}
            style={{
              display: 'inline-grid',
              placeItems: 'center',
              height: 40,
              padding: '0 16px',
              background: '#c45a6a',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {thankYouCtaLabel}
          </Link>
        </p>
      </div>
    </StoreShell>
  );
}
