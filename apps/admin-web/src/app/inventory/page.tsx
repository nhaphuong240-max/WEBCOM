import { PageHeader, Panel, Badge, Button, Input } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';

export const dynamic = 'force-dynamic';

type Product = {
  skus: Array<{ id: string; code: string; available: number }>;
};

async function adjust(formData: FormData) {
  'use server';
  const skuId = String(formData.get('sku_id'));
  const delta = Number(formData.get('delta'));
  await apiJson(`/v1/admin/inventory/${skuId}/adjust`, 'POST', {
    delta,
    reason: 'admin_ui_adjust',
  });
}

export default async function InventoryPage() {
  let rows: Array<{ sku_id: string; code: string; available: number; on_hand?: number; reserved?: number }> =
    [];
  let error = '';
  try {
    const products = await apiGet<Product[]>('/v1/admin/products');
    for (const p of products) {
      for (const s of p.skus) {
        try {
          const bal = await apiGet<{
            sku_id: string;
            on_hand: number;
            reserved: number;
            available: number;
          }>(`/v1/admin/inventory/${s.id}`);
          rows.push({
            sku_id: bal.sku_id,
            code: s.code,
            on_hand: bal.on_hand,
            reserved: bal.reserved,
            available: bal.available,
          });
        } catch {
          rows.push({ sku_id: s.id, code: s.code, available: s.available });
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="On-hand / reserved / available + adjust (Redis lock khi có Redis)."
        actions={<Badge tone="accent">W1</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Balances">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>SKU</th>
              <th>On-hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku_id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>{r.code}</td>
                <td>{r.on_hand ?? '—'}</td>
                <td>{r.reserved ?? '—'}</td>
                <td>{r.available}</td>
                <td>
                  <form action={adjust} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="hidden" name="sku_id" value={r.sku_id} />
                    <Input name="delta" type="number" defaultValue={1} style={{ width: 80 }} />
                    <Button type="submit" size="sm" variant="ghost">
                      Apply
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
