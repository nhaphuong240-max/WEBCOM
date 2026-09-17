import { PageHeader, Panel, Badge, Button, Input } from '@ptt/ui';
import { apiGet, apiJson, BRAND_ID } from '../../lib/api';

export const dynamic = 'force-dynamic';

type Product = {
  id: string;
  title: string;
  slug: string;
  skus: Array<{ id: string; code: string; unit_price: string | null; available: number }>;
};

async function createAction(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/products', 'POST', {
    brand_id: BRAND_ID,
    title: String(formData.get('title') || ''),
    slug: String(formData.get('slug') || ''),
    sku_code: String(formData.get('sku_code') || ''),
    price: Number(formData.get('price') || 0),
    discount_percent: Number(formData.get('discount_percent') || 0) || undefined,
    on_hand: Number(formData.get('on_hand') || 0),
  });
}

export default async function ProductsPage() {
  let products: Product[] = [];
  let error = '';
  try {
    products = await apiGet<Product[]>('/v1/admin/products');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        description="CRUD thô PIM W1 — product / SKU / price / stock."
        actions={<Badge tone="accent">W1</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson', fontSize: 14 }}>{error}</p>
          <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)' }}>
            Chạy admin-api + seed AURA (`pnpm --filter @ptt/admin-api seed`).
          </p>
        </Panel>
      ) : null}

      <Panel title="Danh sách">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Title</th>
              <th>SKU</th>
              <th>Giá</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>{p.title}</td>
                <td>{p.skus[0]?.code}</td>
                <td>{p.skus[0]?.unit_price}</td>
                <td>{p.skus[0]?.available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Tạo nhanh">
        <form action={createAction} style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
          <Input name="title" placeholder="Tên SP" required />
          <Input name="slug" placeholder="slug" required />
          <Input name="sku_code" placeholder="SKU code" required />
          <Input name="price" type="number" placeholder="Giá list" required />
          <Input name="discount_percent" type="number" placeholder="% giảm (optional)" />
          <Input name="on_hand" type="number" placeholder="Tồn on-hand" defaultValue={10} />
          <Button type="submit" variant="primary">
            Tạo product
          </Button>
        </form>
      </Panel>
    </>
  );
}
