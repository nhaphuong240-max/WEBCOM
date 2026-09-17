import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

type Member = {
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  rfm_segment: string | null;
  snapshot_at: string;
};

type Segment = {
  id: string;
  name: string;
  member_count: number;
  last_materialized_at: string | null;
};

export default async function SegmentMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let segment: Segment | null = null;
  let members: Member[] = [];
  let error = '';
  try {
    segment = await apiGet(`/v1/admin/segments/${id}`);
    members = await apiGet(`/v1/admin/segments/${id}/members?limit=100`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!segment && !error) notFound();

  return (
    <>
      <PageHeader
        title={segment?.name || 'Members'}
        description={`Materialized members · ${segment?.member_count ?? 0}`}
        actions={
          <Link href="/segments" style={{ fontSize: 13 }}>
            ← Segments
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Members">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {members.map((m) => (
            <li
              key={m.customer_id}
              style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0', display: 'flex', gap: 8 }}
            >
              <Link href={`/customers/${m.customer_id}`}>{m.name || m.phone || m.customer_id}</Link>
              {m.rfm_segment ? <Badge tone="muted">{m.rfm_segment}</Badge> : null}
              <span style={{ opacity: 0.6, marginLeft: 'auto' }}>{m.snapshot_at.slice(0, 19)}</span>
            </li>
          ))}
          {!members.length ? <li style={{ opacity: 0.6 }}>Chưa materialize hoặc audience rỗng.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
