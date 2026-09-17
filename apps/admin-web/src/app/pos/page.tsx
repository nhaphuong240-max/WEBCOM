import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SKU = process.env.NEXT_PUBLIC_SKU_ID || 'sku_aura_glow_30';
const BARCODE = '8938501234567';

type Location = {
  id: string;
  code: string;
  name: string;
  registers: Array<{ id: string; code: string; name: string }>;
};

type Shift = {
  id: string;
  status: string;
  opening_cash: string;
  sales_count: number;
  sales_total: string;
  tender_summary: Record<string, number>;
};

type Lookup = {
  sku_id: string;
  sku_code: string;
  barcode: string | null;
  product_title: string;
  unit_price: string;
  available_pos: number;
  on_hand_location: number | null;
  available_global: number;
  latency_ms: number;
  within_slo: boolean;
};

type Sale = {
  id: string;
  receipt_no: string;
  status: string;
  total: string;
  payment_summary: string;
  lines: Array<{ sku_id?: string; product_title: string; qty: number; unit_price: string }>;
  order_id: string | null;
  created_at: string;
};

async function ensureStore() {
  'use server';
  await apiJson('/v1/admin/pos/locations/ensure', 'POST', {
    code: 'store_q1',
    name: 'AURA Store Q1',
    register_code: 'reg_1',
  });
  revalidatePath('/pos');
}

async function openShift(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/pos/shifts/open', 'POST', {
    register_id: String(formData.get('register_id')),
    opening_cash: Number(formData.get('opening_cash') || 500000),
  });
  revalidatePath('/pos');
}

async function closeShift(formData: FormData) {
  'use server';
  await apiJson(`/v1/admin/pos/shifts/${String(formData.get('shift_id'))}/close`, 'POST', {
    closing_cash: Number(formData.get('closing_cash') || 0),
  });
  revalidatePath('/pos');
}

async function sell(formData: FormData) {
  'use server';
  const shiftId = String(formData.get('shift_id'));
  const method = String(formData.get('payment_method') || 'cash');
  const qty = Number(formData.get('qty') || 1);
  const lookup = await apiGet<Lookup>(
    `/v1/admin/pos/lookup?q=${encodeURIComponent(String(formData.get('barcode') || BARCODE))}&location_id=${encodeURIComponent(String(formData.get('location_id') || ''))}`,
  );
  const total = Number(lookup.unit_price) * qty;
  await apiJson('/v1/admin/pos/sales', 'POST', {
    shift_id: shiftId,
    lines: [{ sku_id: lookup.sku_id, qty }],
    payments: [{ method, amount: total }],
    customer_name: String(formData.get('customer_name') || 'Walk-in'),
    customer_phone: String(formData.get('customer_phone') || '0901111222'),
  });
  revalidatePath('/pos');
  revalidatePath('/inventory');
}

async function returnSale(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/pos/returns', 'POST', {
    sale_id: String(formData.get('sale_id')),
    shift_id: String(formData.get('shift_id') || '') || undefined,
    lines: [{ sku_id: String(formData.get('sku_id') || SKU), qty: Number(formData.get('qty') || 1) }],
    reason: String(formData.get('reason') || 'Đổi trả quầy'),
    refund_tender: 'cash',
  });
  revalidatePath('/pos');
  revalidatePath('/inventory');
}

export default async function PosPage() {
  let locations: Location[] = [];
  let shift: Shift | null = null;
  let lookup: Lookup | null = null;
  let sales: Sale[] = [];
  let stock: Array<{ sku_id: string; on_hand_location: number; available_global: number; consistent: boolean }> = [];
  let error = '';
  let registerId = '';
  let locationId = '';

  try {
    locations = await apiGet('/v1/admin/pos/locations');
    if (locations.length) {
      locationId = locations[0].id;
      registerId = locations[0].registers[0]?.id || '';
    }
    if (registerId) {
      shift = await apiGet(`/v1/admin/pos/shifts/open?register_id=${registerId}`);
    }
    if (locationId) {
      lookup = await apiGet(`/v1/admin/pos/lookup?q=${BARCODE}&location_id=${locationId}`);
      stock = await apiGet(`/v1/admin/pos/locations/${locationId}/stock`);
    }
    if (shift?.id) {
      sales = await apiGet(`/v1/admin/pos/sales?shift_id=${shift.id}`);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="POS"
        description="B3 — 1 cửa hàng · barcode sell · shift · tồn location đồng bộ web · đổi trả cơ bản."
        actions={<Badge tone="accent">B3</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Cửa hàng / quầy">
        {!locations.length ? (
          <form action={ensureStore}>
            <Button type="submit" variant="primary">
              Tạo Store Q1 + Register 1
            </Button>
          </form>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0 }}>
            {locations.map((l) => (
              <li key={l.id} style={{ marginBottom: 8 }}>
                <strong>{l.name}</strong> · {l.code}
                <div style={{ opacity: 0.7 }}>
                  Registers: {l.registers.map((r) => `${r.code} (${r.id.slice(0, 12)}…)`).join(', ')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ca làm việc">
        {shift ? (
          <div style={{ fontSize: 13 }}>
            <p>
              Shift <code>{shift.id}</code> · <Badge tone="accent">{shift.status}</Badge> · opening{' '}
              {shift.opening_cash} · sales {shift.sales_count} / {shift.sales_total}
            </p>
            <pre style={{ fontSize: 12, background: 'rgba(0,0,0,0.03)', padding: 8 }}>
              {JSON.stringify(shift.tender_summary, null, 2)}
            </pre>
            <form action={closeShift} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'end' }}>
              <input type="hidden" name="shift_id" value={shift.id} />
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                Closing cash
                <input name="closing_cash" type="number" defaultValue={Number(shift.opening_cash) + Number(shift.sales_total)} style={{ padding: 8 }} />
              </label>
              <Button type="submit" variant="primary">
                Đóng ca
              </Button>
            </form>
          </div>
        ) : registerId ? (
          <form action={openShift} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <input type="hidden" name="register_id" value={registerId} />
            <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
              Opening cash
              <input name="opening_cash" type="number" defaultValue={500000} style={{ padding: 8 }} />
            </label>
            <Button type="submit" variant="primary">
              Mở ca
            </Button>
          </form>
        ) : (
          <p style={{ opacity: 0.6 }}>Cần register trước.</p>
        )}
      </Panel>

      <Panel title="Barcode lookup (NFR ≤500ms)">
        {lookup ? (
          <div style={{ fontSize: 13 }}>
            <strong>{lookup.product_title}</strong> · {lookup.sku_code} · barcode {lookup.barcode}
            <div>
              Giá {lookup.unit_price} · POS avail {lookup.available_pos} · global {lookup.available_global} · loc{' '}
              {lookup.on_hand_location}
            </div>
            <div>
              latency {lookup.latency_ms}ms{' '}
              <Badge tone={lookup.within_slo ? 'accent' : undefined}>
                {lookup.within_slo ? 'within SLO' : 'slow'}
              </Badge>
            </div>
          </div>
        ) : (
          <p style={{ opacity: 0.6 }}>Chưa lookup được SKU.</p>
        )}
      </Panel>

      <Panel title="Bán tại quầy">
        {shift ? (
          <form action={sell} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
            <input type="hidden" name="shift_id" value={shift.id} />
            <input type="hidden" name="location_id" value={locationId} />
            <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
              Barcode / SKU
              <input name="barcode" defaultValue={BARCODE} style={{ padding: 8 }} />
            </label>
            <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
              Qty
              <input name="qty" type="number" min={1} defaultValue={1} style={{ padding: 8 }} />
            </label>
            <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
              Payment
              <select name="payment_method" defaultValue="cash" style={{ padding: 8 }}>
                <option value="cash">cash</option>
                <option value="COD">COD</option>
                <option value="TRANSFER">TRANSFER (QR)</option>
              </select>
            </label>
            <input name="customer_name" placeholder="Khách" defaultValue="Walk-in" style={{ padding: 8 }} />
            <Button type="submit" variant="primary">
              Thanh toán & in receipt
            </Button>
          </form>
        ) : (
          <p style={{ opacity: 0.6 }}>Mở ca trước khi bán.</p>
        )}
      </Panel>

      <Panel title="Tồn location ↔ web">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>SKU</th>
              <th>Location</th>
              <th>Global avail</th>
              <th>OK</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.sku_id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{s.sku_id}</td>
                <td>{s.on_hand_location}</td>
                <td>{s.available_global}</td>
                <td>{s.consistent ? '✓' : '!'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Receipts ca hiện tại">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {sales.map((s) => (
            <li key={s.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '10px 0' }}>
              <strong>{s.receipt_no}</strong> · {s.total} · {s.payment_summary} · <Badge>{s.status}</Badge>
              <div style={{ opacity: 0.7 }}>
                {(s.lines || []).map((l) => `${l.qty}× ${l.product_title}`).join(', ')}
                {s.order_id ? ` · OMS ${s.order_id}` : ''}
              </div>
              {s.status === 'completed' || s.status === 'partial_return' ? (
                <form action={returnSale} style={{ marginTop: 6 }}>
                  <input type="hidden" name="sale_id" value={s.id} />
                  <input type="hidden" name="shift_id" value={shift?.id || ''} />
                  <input type="hidden" name="sku_id" value={s.lines?.[0]?.sku_id || SKU} />
                  <input type="hidden" name="qty" value="1" />
                  <Button type="submit" size="sm" variant="ghost">
                    Đổi trả 1
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
          {!sales.length ? <li style={{ opacity: 0.6 }}>Chưa có bán trong ca.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
