import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  status: string;
  lifetime_orders: number;
  lifetime_spend: string;
  last_order_at: string | null;
  consent_marketing: boolean;
};

async function ensureCustomer(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/customers/ensure', 'POST', {
    phone: String(formData.get('phone') || '0901234567'),
    email: String(formData.get('email') || 'lan@aura.local'),
    name: String(formData.get('name') || 'Lan Nguyen'),
    tags: String(formData.get('tags') || 'vip,beauty')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    notes: String(formData.get('notes') || 'C1 seed guest'),
    consent_marketing: true,
    consent_email: true,
    consent_sms: true,
    consent_messenger: true,
    addresses: [
      {
        label: 'Home',
        line1: '1 Nguyen Hue',
        city: 'HCM',
        phone: String(formData.get('phone') || '0901234567'),
        is_default: true,
      },
    ],
  });
  revalidatePath('/customers');
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  let rows: CustomerRow[] = [];
  let status: { wave: string } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/crm/status');
    rows = await apiGet(`/v1/admin/customers?limit=50${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="C3 — Customer 360 + RFM + segments."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone="accent">{status?.wave || 'C3'}</Badge>
            <Link href="/segments" style={{ fontSize: 13 }}>
              Segments →
            </Link>
            <Link href="/customers/matches" style={{ fontSize: 13 }}>
              Matches →
            </Link>
          </div>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Ensure customer">
        <form action={ensureCustomer} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="name" defaultValue="Lan Nguyen" style={{ padding: 8 }} />
          <input name="phone" defaultValue="0901234567" style={{ padding: 8 }} />
          <input name="email" defaultValue="lan@aura.local" style={{ padding: 8 }} />
          <input name="tags" defaultValue="vip,beauty" style={{ padding: 8 }} />
          <textarea name="notes" defaultValue="Khách AURA demo C1" rows={2} style={{ padding: 8 }} />
          <Button type="submit" variant="primary">
            Ensure / upsert
          </Button>
        </form>
      </Panel>

      <Panel title="Tìm kiếm">
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input name="q" defaultValue={q} placeholder="phone / email / name / tag" style={{ padding: 8, flex: 1 }} />
          <Button type="submit">Search</Button>
        </form>
      </Panel>

      <Panel title="Danh sách">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Spend</th>
              <th>Tags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>
                  <strong>{c.name || '—'}</strong>
                  <div style={{ opacity: 0.65, fontSize: 11 }}>{c.email || '—'}</div>
                </td>
                <td>{c.phone || '—'}</td>
                <td>{c.lifetime_orders}</td>
                <td>{c.lifetime_spend}</td>
                <td>{(c.tags || []).join(', ') || '—'}</td>
                <td>
                  <Link href={`/customers/${c.id}`} style={{ color: 'var(--ptt-accent)', fontSize: 13 }}>
                    360 →
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.6 }}>
                  Chưa có customer — bấm Ensure.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
