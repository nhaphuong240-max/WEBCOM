import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

export default async function WebsiteLeadsPage() {
  let items: Array<{
    id: string;
    name: string;
    phone?: string | null;
    email: string;
    channel: string;
    message: string;
    created_at: string;
  }> = [];
  let error = '';
  try {
    const res = await apiGet<{ items: typeof items }>(`/v1/admin/storefronts/${SF}/leads?limit=100`);
    items = res.items || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const csv =
    'name,phone,email,channel,created_at\n' +
    items
      .map((i) =>
        [i.name, i.phone || '', i.email, i.channel, i.created_at]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

  return (
    <>
      <PageHeader
        title="Leads"
        description="Lead capture từ storefront CMS (FR-006)"
        actions={<Badge tone="accent">S12</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel
        title={`${items.length} leads`}
        action={
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download="leads.csv"
            style={{ fontSize: 12, color: 'var(--ptt-accent)', fontWeight: 600 }}
          >
            Export CSV
          </a>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ptt-ink-3)', fontSize: 11 }}>
              <th style={{ padding: 8 }}>Tên</th>
              <th style={{ padding: 8 }}>SĐT</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Kênh</th>
              <th style={{ padding: 8 }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={{ borderTop: '1px solid var(--ptt-paper-2)' }}>
                <td style={{ padding: 8 }}>{i.name}</td>
                <td style={{ padding: 8 }}>{i.phone || '—'}</td>
                <td style={{ padding: 8 }}>{i.email}</td>
                <td style={{ padding: 8 }}>{i.channel}</td>
                <td style={{ padding: 8 }}>{new Date(i.created_at).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
