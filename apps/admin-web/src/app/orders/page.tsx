import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';

export const dynamic = 'force-dynamic';

type Order = {
  id: string;
  status: string;
  total: string;
  payment_method: string;
  created_at: string;
  lines: Array<{ title: string; qty: number }>;
};

async function cancelOrder(formData: FormData) {
  'use server';
  const id = String(formData.get('order_id'));
  await apiJson(`/v1/admin/orders/${id}/transition`, 'POST', { status: 'CANCELLED' });
}

export default async function OrdersPage() {
  let orders: Order[] = [];
  let error = '';
  try {
    orders = await apiGet<Order[]>('/v1/admin/orders');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Đơn hàng"
        description="OMS W1 — CONFIRMED → FULFILLING/SHIPPED/COMPLETED hoặc CANCELLED (release stock)."
        actions={<Badge tone="accent">W1</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Danh sách gần đây">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Order</th>
              <th>Status</th>
              <th>Total</th>
              <th>Pay</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{o.id}</td>
                <td>{o.status}</td>
                <td>{o.total}</td>
                <td>{o.payment_method}</td>
                <td>
                  {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' ? (
                    <form action={cancelOrder}>
                      <input type="hidden" name="order_id" value={o.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
