import Link from 'next/link';
import { StoreShell } from '../../../components/StoreShell';
import { formatVnd, storeApi } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: {
    id: string;
    status: string;
    total: string;
    payment_method: string;
    lines: Array<{ title: string; qty: number; line_total: string }>;
  } | null = null;
  let error = '';
  try {
    order = await storeApi(`/v1/orders/${id}`, { cache: 'no-store' });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Not found';
  }

  return (
    <StoreShell>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Đơn hàng</h1>
        {error || !order ? (
          <p style={{ color: 'crimson' }}>{error || 'Không tìm thấy'}</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, color: '#6b5559' }}>
              <code>{order.id}</code>
            </p>
            <p>
              <strong>{order.status}</strong> · {order.payment_method} · {formatVnd(order.total)}
            </p>
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
                <strong>QR stub:</strong> quét chuyển khoản nội dung <code>{order.id.slice(-8)}</code>
              </div>
            ) : null}
          </div>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/">Về cửa hàng</Link>
        </p>
      </div>
    </StoreShell>
  );
}
