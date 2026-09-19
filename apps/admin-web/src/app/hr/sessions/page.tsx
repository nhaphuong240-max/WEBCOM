import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function HrLoginEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; success?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.email) qs.set('email', sp.email);
  if (sp.success) qs.set('success', sp.success);
  const q = qs.toString() ? `?${qs}` : '';

  let events: Array<{
    id: string;
    email: string;
    success: boolean;
    reason: string | null;
    ip: string | null;
    created_at: string;
  }> = [];
  let error = '';
  try {
    events = await apiGet(`/v1/admin/hr/login-events${q}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Login history"
        description="HR-2 · LoginEvent"
        actions={<Badge tone="accent">HR-2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Events">
        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input name="email" placeholder="email" defaultValue={sp.email || ''} style={{ padding: 8 }} />
          <select name="success" defaultValue={sp.success || ''} style={{ padding: 8 }}>
            <option value="">all</option>
            <option value="true">success</option>
            <option value="false">fail</option>
          </select>
          <button type="submit" style={{ padding: '8px 12px' }}>
            Filter
          </button>
        </form>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.map((e) => (
            <li
              key={e.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #eee',
                fontSize: 13,
              }}
            >
              <Badge tone={e.success ? 'accent' : 'warn'}>{e.success ? 'ok' : 'fail'}</Badge>{' '}
              {e.email} · {e.ip || '—'} · {e.created_at}
              {e.reason ? (
                <span style={{ color: '#6b5559' }}> · {e.reason}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
