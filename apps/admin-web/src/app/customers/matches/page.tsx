import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type MatchRow = {
  id: string;
  score: number;
  status: string;
  signals: unknown;
  left: { id: string; name: string; phone: string | null; email: string | null };
  right: { id: string; name: string; phone: string | null; email: string | null };
  created_at: string;
};

type MergeEvent = {
  id: string;
  survivor_id: string;
  merged_id: string;
  status: string;
  reason: string;
  merged_at: string;
  unmerged_at: string | null;
};

async function scanMatches() {
  'use server';
  await apiJson('/v1/admin/crm/matches/scan', 'POST', {});
  revalidatePath('/customers/matches');
}

async function dismissMatch(formData: FormData) {
  'use server';
  const id = String(formData.get('match_id'));
  await apiJson(`/v1/admin/crm/matches/${id}/dismiss`, 'POST', {});
  revalidatePath('/customers/matches');
}

async function mergeMatch(formData: FormData) {
  'use server';
  const matchId = String(formData.get('match_id'));
  const survivorId = String(formData.get('survivor_id'));
  const mergedId = String(formData.get('merged_id'));
  await apiJson('/v1/admin/crm/merge', 'POST', {
    survivor_id: survivorId,
    merged_id: mergedId,
    match_id: matchId,
    reason: 'admin_match_queue',
  });
  revalidatePath('/customers/matches');
  revalidatePath('/customers');
  revalidatePath(`/customers/${survivorId}`);
}

async function unmergeEvent(formData: FormData) {
  'use server';
  const eventId = String(formData.get('event_id'));
  await apiJson(`/v1/admin/crm/merge/${eventId}/unmerge`, 'POST', {});
  revalidatePath('/customers/matches');
  revalidatePath('/customers');
}

export default async function CustomerMatchesPage() {
  let matches: MatchRow[] = [];
  let events: MergeEvent[] = [];
  let status: { wave: string } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/crm/status');
    matches = await apiGet('/v1/admin/crm/matches?status=pending&limit=50');
    events = await apiGet('/v1/admin/crm/merge-events?limit=20');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Identity matches"
        description="C2 — match queue · merge / unmerge (BR-006 soft) · audit."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone="accent">{status?.wave || 'C2'}</Badge>
            <Link href="/customers" style={{ fontSize: 13 }}>
              ← Customers
            </Link>
          </div>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Scan">
        <form action={scanMatches}>
          <Button type="submit" variant="primary">
            Scan identity matches
          </Button>
        </form>
      </Panel>

      <Panel title={`Pending matches (${matches.length})`}>
        {matches.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No pending candidates. Run scan or add conflicting identities.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {matches.map((m) => (
              <li
                key={m.id}
                style={{
                  borderTop: '1px solid var(--border, #ddd)',
                  paddingTop: 12,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13 }}>
                  Score <strong>{m.score}</strong> · {m.left.name || m.left.phone || m.left.id} ↔{' '}
                  {m.right.name || m.right.phone || m.right.id}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  L:{' '}
                  <Link href={`/customers/${m.left.id}`}>
                    {m.left.phone || m.left.email || m.left.id}
                  </Link>{' '}
                  · R:{' '}
                  <Link href={`/customers/${m.right.id}`}>
                    {m.right.phone || m.right.email || m.right.id}
                  </Link>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <form action={mergeMatch}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <input type="hidden" name="survivor_id" value={m.left.id} />
                    <input type="hidden" name="merged_id" value={m.right.id} />
                    <Button type="submit" variant="primary">
                      Merge → left survivor
                    </Button>
                  </form>
                  <form action={mergeMatch}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <input type="hidden" name="survivor_id" value={m.right.id} />
                    <input type="hidden" name="merged_id" value={m.left.id} />
                    <Button type="submit">Merge → right survivor</Button>
                  </form>
                  <form action={dismissMatch}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <Button type="submit">Dismiss</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Merge audit">
        {events.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No merge events yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {events.map((e) => (
              <li
                key={e.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 13,
                  borderTop: '1px solid var(--border, #ddd)',
                  paddingTop: 8,
                }}
              >
                <Badge tone={e.status === 'merged' ? 'accent' : 'muted'}>{e.status}</Badge>
                <Link href={`/customers/${e.survivor_id}`}>survivor {e.survivor_id.slice(0, 12)}</Link>
                <span>←</span>
                <span>{e.merged_id.slice(0, 12)}</span>
                <span style={{ opacity: 0.6 }}>{e.reason}</span>
                <span style={{ opacity: 0.6 }}>{e.merged_at.slice(0, 19)}</span>
                {e.status === 'merged' ? (
                  <form action={unmergeEvent}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <Button type="submit">Unmerge</Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
