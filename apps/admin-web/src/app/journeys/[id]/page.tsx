import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Journey = {
  id: string;
  name: string;
  status: string;
  category: string;
  steps: Array<{ id: string; kind: string; config: Record<string, unknown>; sort_order: number }>;
};

type Enrollment = {
  id: string;
  status: string;
  customer_id: string;
  waiting_until: string | null;
  block_reason: string | null;
  enrolled_at: string;
  customer?: { name: string; phone: string | null };
};

async function drainJourney(formData: FormData) {
  'use server';
  const id = String(formData.get('journey_id'));
  await apiJson('/v1/admin/journeys/drain', 'POST', { journey_id: id, limit: 50 });
  revalidatePath(`/journeys/${id}`);
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let journey: Journey | null = null;
  let enrollments: Enrollment[] = [];
  let error = '';
  try {
    journey = await apiGet(`/v1/admin/journeys/${id}`);
    enrollments = await apiGet(`/v1/admin/journeys/${id}/enrollments?limit=50`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!journey && !error) notFound();

  return (
    <>
      <PageHeader
        title={journey?.name || 'Journey'}
        description={`${journey?.category || ''} · ${journey?.status || ''}`}
        actions={
          <Link href="/journeys" style={{ fontSize: 13 }}>
            ← Journeys
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      {journey ? (
        <>
          <Panel title="Steps">
            <ol style={{ fontSize: 13, paddingLeft: 20 }}>
              {journey.steps.map((s) => (
                <li key={s.id} style={{ marginBottom: 6 }}>
                  <Badge>{s.kind}</Badge>{' '}
                  <code style={{ fontSize: 11 }}>{JSON.stringify(s.config)}</code>
                </li>
              ))}
            </ol>
            <form action={drainJourney} style={{ marginTop: 12 }}>
              <input type="hidden" name="journey_id" value={journey.id} />
              <Button type="submit" size="sm">
                Drain this journey
              </Button>
            </form>
          </Panel>

          <Panel title={`Enrollments (${enrollments.length})`}>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {enrollments.map((e) => (
                <li
                  key={e.id}
                  style={{
                    borderTop: '1px solid var(--ptt-line)',
                    padding: '8px 0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <Badge
                    tone={
                      e.status === 'completed'
                        ? 'accent'
                        : e.status === 'blocked'
                          ? 'warn'
                          : 'muted'
                    }
                  >
                    {e.status}
                  </Badge>
                  <Link href={`/customers/${e.customer_id}`}>
                    {e.customer?.name || e.customer_id}
                  </Link>
                  {e.waiting_until ? (
                    <span style={{ opacity: 0.7 }}>wait {e.waiting_until.slice(0, 19)}</span>
                  ) : null}
                  {e.block_reason ? (
                    <span style={{ color: 'crimson' }}>{e.block_reason}</span>
                  ) : null}
                  <Link
                    href={`/journeys/${id}/enrollments/${e.id}`}
                    style={{ marginLeft: 'auto', fontSize: 12 }}
                  >
                    Logs →
                  </Link>
                </li>
              ))}
              {!enrollments.length ? <li style={{ opacity: 0.6 }}>Chưa enroll.</li> : null}
            </ul>
          </Panel>
        </>
      ) : null}
    </>
  );
}
