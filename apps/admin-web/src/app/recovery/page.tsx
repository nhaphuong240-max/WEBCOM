import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Ticket = {
  id: string;
  customer_id: string;
  subject: string;
  status: string;
  priority: string;
  playbook_code: string | null;
  care_reply_draft: string | null;
  customer?: { name: string; phone: string | null };
};

type Nba = {
  id: string;
  customer_id: string;
  action: string;
  reason: string;
  status: string;
  expected_outcome: string;
};

async function scanPlaybooks() {
  'use server';
  await apiJson('/v1/admin/cx/playbooks/scan', 'POST', {});
  revalidatePath('/recovery');
}

async function createManualTicket(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/cx/tickets', 'POST', {
    customer_id: String(formData.get('customer_id')),
    subject: String(formData.get('subject') || 'Manual care'),
    description: String(formData.get('description') || ''),
    playbook_code: 'manual',
    priority: String(formData.get('priority') || 'normal'),
  });
  revalidatePath('/recovery');
}

async function suggestNba(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/cx/nba/suggest', 'POST', {
    customer_id: String(formData.get('customer_id')),
    ticket_id: String(formData.get('ticket_id') || '') || undefined,
  });
  revalidatePath('/recovery');
}

async function applyNba(formData: FormData) {
  'use server';
  const id = String(formData.get('nba_id'));
  await apiJson(`/v1/admin/cx/nba/${id}/apply`, 'POST', {});
  revalidatePath('/recovery');
}

async function dismissNba(formData: FormData) {
  'use server';
  const id = String(formData.get('nba_id'));
  await apiJson(`/v1/admin/cx/nba/${id}`, 'PATCH', { status: 'dismissed' });
  revalidatePath('/recovery');
}

async function careReply(formData: FormData) {
  'use server';
  const id = String(formData.get('ticket_id'));
  await apiJson(`/v1/admin/cx/tickets/${id}/care-reply`, 'POST', { tone: 'empathetic' });
  revalidatePath('/recovery');
}

async function resolveTicket(formData: FormData) {
  'use server';
  const id = String(formData.get('ticket_id'));
  await apiJson(`/v1/admin/cx/tickets/${id}`, 'PATCH', { status: 'resolved' });
  revalidatePath('/recovery');
}

export default async function RecoveryPage() {
  let tickets: Ticket[] = [];
  let nba: Nba[] = [];
  let status: { wave: string } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/cx/status');
    tickets = await apiGet('/v1/admin/cx/tickets?limit=50');
    nba = await apiGet('/v1/admin/cx/nba?limit=50');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Service recovery"
        description="C6 — tickets · playbooks · NBA · AI care/nba (BR-018 approval)."
        actions={<Badge tone="accent">{status?.wave || 'C6'}</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Playbook scan">
        <form action={scanPlaybooks}>
          <Button type="submit" variant="primary">
            Scan delay COD / fail payment / negative keyword
          </Button>
        </form>
      </Panel>

      <Panel title="Manual ticket">
        <form action={createManualTicket} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="customer_id" placeholder="customer_id" required style={{ padding: 8 }} />
          <input name="subject" defaultValue="VIP care follow-up" style={{ padding: 8 }} />
          <textarea name="description" rows={2} defaultValue="Manual C6 ticket" style={{ padding: 8 }} />
          <select name="priority" defaultValue="normal" style={{ padding: 8 }}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <Button type="submit">Create ticket</Button>
        </form>
      </Panel>

      <Panel title={`Tickets (${tickets.length})`}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {tickets.map((t) => (
            <li
              key={t.id}
              style={{ borderTop: '1px solid var(--ptt-line)', paddingTop: 10, fontSize: 13 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Badge tone={t.priority === 'urgent' ? 'danger' : 'accent'}>{t.priority}</Badge>
                <Badge>{t.status}</Badge>
                {t.playbook_code ? <Badge tone="muted">{t.playbook_code}</Badge> : null}
                <strong>{t.subject}</strong>
              </div>
              <div style={{ marginTop: 4 }}>
                <Link href={`/customers/${t.customer_id}`}>
                  {t.customer?.name || t.customer_id}
                </Link>
              </div>
              {t.care_reply_draft ? (
                <pre style={{ fontSize: 11, opacity: 0.75, whiteSpace: 'pre-wrap' }}>
                  {t.care_reply_draft}
                </pre>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <form action={suggestNba} style={{ display: 'flex', gap: 6 }}>
                  <input type="hidden" name="customer_id" value={t.customer_id} />
                  <input type="hidden" name="ticket_id" value={t.id} />
                  <Button type="submit" size="sm">
                    Suggest NBA
                  </Button>
                </form>
                <form action={careReply}>
                  <input type="hidden" name="ticket_id" value={t.id} />
                  <Button type="submit" size="sm">
                    AI care reply
                  </Button>
                </form>
                {t.status === 'open' || t.status === 'in_progress' ? (
                  <form action={resolveTicket}>
                    <input type="hidden" name="ticket_id" value={t.id} />
                    <Button type="submit" size="sm">
                      Resolve
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
          {!tickets.length ? <li style={{ opacity: 0.6 }}>No tickets — scan or create.</li> : null}
        </ul>
      </Panel>

      <Panel title={`NBA (${nba.length})`}>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {nba.map((n) => (
            <li
              key={n.id}
              style={{
                borderTop: '1px solid var(--ptt-line)',
                padding: '8px 0',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Badge tone="accent">{n.action}</Badge>
              <Badge tone="muted">{n.status}</Badge>
              <span>{n.reason}</span>
              <Link href={`/customers/${n.customer_id}`} style={{ fontSize: 12 }}>
                customer
              </Link>
              {n.status === 'suggested' || n.status === 'accepted' ? (
                <>
                  <form action={applyNba}>
                    <input type="hidden" name="nba_id" value={n.id} />
                    <Button type="submit" size="sm" variant="primary">
                      Apply
                    </Button>
                  </form>
                  <form action={dismissNba}>
                    <input type="hidden" name="nba_id" value={n.id} />
                    <Button type="submit" size="sm">
                      Dismiss
                    </Button>
                  </form>
                </>
              ) : null}
            </li>
          ))}
          {!nba.length ? <li style={{ opacity: 0.6 }}>No NBA yet.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
