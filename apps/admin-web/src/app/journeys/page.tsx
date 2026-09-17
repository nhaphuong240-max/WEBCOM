import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Journey = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  trigger_type: string;
  required_consent: string[];
  frequency_cap_days: number;
  frequency_cap_count: number;
  enrollment_count: number;
  steps: Array<{ id: string; kind: string; config: Record<string, unknown>; sort_order: number }>;
};

async function createJourney(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || `Welcome ${Date.now()}`);
  await apiJson('/v1/admin/journeys', 'POST', {
    name,
    description: String(formData.get('description') || 'C5 welcome journey'),
    category: String(formData.get('category') || 'onboarding'),
    status: 'draft',
    trigger_type: 'manual',
    required_consent: ['email', 'marketing'],
    frequency_cap_days: 7,
    frequency_cap_count: 1,
    steps: [
      { kind: 'trigger', config: { type: 'manual' } },
      { kind: 'condition', config: { field: 'consent_email', op: 'eq', value: true } },
      { kind: 'delay', config: { minutes: 0 } },
      { kind: 'action', config: { type: 'tag', tag: 'journey_welcome' } },
      { kind: 'action', config: { type: 'send_email', template: 'Welcome stub' } },
      { kind: 'action', config: { type: 'voucher_stub', code: 'WELCOME10' } },
      { kind: 'exit', config: { reason: 'done' } },
    ],
  });
  revalidatePath('/journeys');
}

async function activateJourney(formData: FormData) {
  'use server';
  const id = String(formData.get('journey_id'));
  await apiJson(`/v1/admin/journeys/${id}`, 'PATCH', { status: 'active' });
  revalidatePath('/journeys');
}

async function enrollCustomer(formData: FormData) {
  'use server';
  const id = String(formData.get('journey_id'));
  await apiJson(`/v1/admin/journeys/${id}/enroll`, 'POST', {
    customer_id: String(formData.get('customer_id')),
  });
  revalidatePath('/journeys');
  revalidatePath(`/journeys/${id}`);
}

async function drainAll() {
  'use server';
  await apiJson('/v1/admin/journeys/drain', 'POST', { limit: 50 });
  revalidatePath('/journeys');
}

async function deleteJourney(formData: FormData) {
  'use server';
  const id = String(formData.get('journey_id'));
  await apiJson(`/v1/admin/journeys/${id}`, 'DELETE', {});
  revalidatePath('/journeys');
}

export default async function JourneysPage() {
  let journeys: Journey[] = [];
  let status: { wave: string } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/journeys/status');
    journeys = await apiGet('/v1/admin/journeys');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Journeys"
        description="C5 — Trigger → condition → delay → action stub · consent + frequency cap · conflict."
        actions={<Badge tone="accent">{status?.wave || 'C5'}</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Create welcome journey">
        <form action={createJourney} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="name" defaultValue="Welcome email" style={{ padding: 8 }} />
          <input name="description" defaultValue="Onboarding stub" style={{ padding: 8 }} />
          <select name="category" defaultValue="onboarding" style={{ padding: 8 }}>
            <option value="onboarding">onboarding</option>
            <option value="retention">retention</option>
            <option value="winback">winback</option>
            <option value="promo">promo</option>
            <option value="care">care</option>
          </select>
          <Button type="submit" variant="primary">
            Create (default steps)
          </Button>
        </form>
      </Panel>

      <Panel title="Drain">
        <form action={drainAll}>
          <Button type="submit">Run-once drain (due enrollments)</Button>
        </form>
      </Panel>

      <Panel title={`Journeys (${journeys.length})`}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
          {journeys.map((j) => (
            <li
              key={j.id}
              style={{ borderTop: '1px solid var(--ptt-line, #ddd)', paddingTop: 12, fontSize: 13 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong>{j.name}</strong>
                <Badge tone={j.status === 'active' ? 'accent' : 'muted'}>{j.status}</Badge>
                <Badge>{j.category}</Badge>
                <span>enrollments {j.enrollment_count}</span>
                <span style={{ opacity: 0.7 }}>
                  cap {j.frequency_cap_count}/{j.frequency_cap_days}d
                </span>
              </div>
              {j.description ? <div style={{ opacity: 0.7, marginTop: 4 }}>{j.description}</div> : null}
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Steps:{' '}
                {j.steps.map((s) => s.kind).join(' → ') || '—'}
              </div>
              <div style={{ marginTop: 4, opacity: 0.7 }}>
                Consent: {(j.required_consent || []).join(', ') || 'none'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {j.status !== 'active' ? (
                  <form action={activateJourney}>
                    <input type="hidden" name="journey_id" value={j.id} />
                    <Button type="submit" size="sm" variant="primary">
                      Activate
                    </Button>
                  </form>
                ) : null}
                <form action={enrollCustomer} style={{ display: 'flex', gap: 6 }}>
                  <input type="hidden" name="journey_id" value={j.id} />
                  <input
                    name="customer_id"
                    placeholder="customer_id"
                    required
                    style={{ padding: 6, minWidth: 180 }}
                  />
                  <Button type="submit" size="sm">
                    Enroll
                  </Button>
                </form>
                <Link href={`/journeys/${j.id}`}>
                  <Button type="button" size="sm">
                    Detail →
                  </Button>
                </Link>
                <form action={deleteJourney}>
                  <input type="hidden" name="journey_id" value={j.id} />
                  <Button type="submit" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
          {!journeys.length ? <li style={{ opacity: 0.6 }}>Chưa có journey.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
