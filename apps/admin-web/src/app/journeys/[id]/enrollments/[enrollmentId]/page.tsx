import Link from 'next/link';
import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '../../../../../lib/api';

export const dynamic = 'force-dynamic';

type Log = {
  id: string;
  step_id: string | null;
  status: string;
  message: string;
  payload: unknown;
  created_at: string;
};

export default async function EnrollmentLogsPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  let logs: Log[] = [];
  let error = '';
  try {
    logs = await apiGet(`/v1/admin/journey-enrollments/${enrollmentId}/logs?limit=100`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Run logs"
        description={enrollmentId}
        actions={
          <Link href={`/journeys/${id}`} style={{ fontSize: 13 }}>
            ← Journey
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Timeline">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {logs.map((l) => (
            <li
              key={l.id}
              style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge
                  tone={
                    l.status === 'ok' ? 'accent' : l.status === 'skipped' || l.status === 'blocked' ? 'warn' : 'danger'
                  }
                >
                  {l.status}
                </Badge>
                <span>{l.message}</span>
                <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{l.created_at.slice(0, 19)}</span>
              </div>
              <pre style={{ fontSize: 11, opacity: 0.7, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(l.payload)}
              </pre>
            </li>
          ))}
          {!logs.length ? <li style={{ opacity: 0.6 }}>No logs.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
