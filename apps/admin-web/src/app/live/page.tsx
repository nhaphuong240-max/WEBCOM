import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';
const SKU = process.env.NEXT_PUBLIC_SKU_ID || 'sku_aura_glow_30';

type Session = {
  id: string;
  title: string;
  status: string;
  host_name: string;
  gmv_actual: string;
  gmv_target: string;
  orders_count: number;
  comments_count: number;
  viewers_current: number;
  items: Array<{ id: string; keyword: string; product_title: string; sku_id: string; deal_price: string | null }>;
};

async function createSession(formData: FormData) {
  'use server';
  const s = await apiJson<Session>('/v1/admin/live/sessions', 'POST', {
    title: String(formData.get('title') || 'AURA Live Glow'),
    host_name: String(formData.get('host_name') || 'Host Mai'),
    storefront_id: SF,
    gmv_target: Number(formData.get('gmv_target') || 5000000),
    stock_alert_threshold: Number(formData.get('threshold') || 5),
    script_notes: 'Pitch serum → keyword SERUM1',
  });
  await apiJson(`/v1/admin/live/sessions/${s.id}/items`, 'POST', {
    sku_id: SKU,
    keyword: String(formData.get('keyword') || 'SERUM1'),
    deal_price: Number(formData.get('deal_price') || 399000),
  });
  revalidatePath('/live');
}

async function startSession(formData: FormData) {
  'use server';
  await apiJson(`/v1/admin/live/sessions/${String(formData.get('session_id'))}/start`, 'POST', {});
  revalidatePath('/live');
}

async function endSession(formData: FormData) {
  'use server';
  await apiJson(`/v1/admin/live/sessions/${String(formData.get('session_id'))}/end`, 'POST', {});
  revalidatePath('/live');
}

async function ingestComment(formData: FormData) {
  'use server';
  const id = String(formData.get('session_id'));
  await apiJson(`/v1/admin/live/sessions/${id}/comments`, 'POST', {
    body: String(formData.get('body') || 'SERUM1'),
    author_name: String(formData.get('author_name') || 'Viewer Lan'),
    author_handle: String(formData.get('author_handle') || 'lan_viewer'),
    payment_method: String(formData.get('payment_method') || 'COD'),
    auto_convert: true,
  });
  revalidatePath('/live');
}

export default async function LivePage() {
  let sessions: Session[] = [];
  let active: Awaited<ReturnType<typeof apiGet<Session & { comments: unknown[]; alerts: unknown[] }>>> | null =
    null;
  let recovery: { items: Array<{ order_id: string; payment_status: string; total: string }>; count: number } | null =
    null;
  let error = '';

  try {
    sessions = await apiGet('/v1/admin/live/sessions');
    const live = sessions.find((s) => s.status === 'live') || sessions[0];
    if (live) {
      active = await apiGet(`/v1/admin/live/sessions/${live.id}`);
      if (live.status === 'ended' || live.status === 'live') {
        recovery = await apiGet(`/v1/admin/live/sessions/${live.id}/recovery`);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Live Commerce"
        description="B4 — Plan session · keyword→order · comment feed stub · stock alert · post-live recovery."
        actions={<Badge tone="accent">B4</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Tạo phiên live">
        <form action={createSession} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="title" defaultValue="AURA Live Glow Night" style={{ padding: 8 }} />
          <input name="host_name" defaultValue="Host Mai" style={{ padding: 8 }} />
          <input name="keyword" defaultValue="SERUM1" placeholder="Keyword" style={{ padding: 8 }} />
          <input name="deal_price" type="number" defaultValue={399000} style={{ padding: 8 }} />
          <input name="threshold" type="number" defaultValue={5} style={{ padding: 8 }} />
          <Button type="submit" variant="primary">
            Tạo session + gắn SKU/keyword
          </Button>
        </form>
      </Panel>

      <Panel title="Danh sách phiên">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {sessions.map((s) => (
            <li key={s.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '10px 0' }}>
              <strong>{s.title}</strong> · <Badge tone="accent">{s.status}</Badge> · orders {s.orders_count} ·
              GMV {s.gmv_actual}/{s.gmv_target}
              <div style={{ opacity: 0.7 }}>
                {(s.items || []).map((i) => `${i.keyword}→${i.product_title}`).join(' · ') || 'no items'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {s.status === 'draft' || s.status === 'scheduled' ? (
                  <form action={startSession}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <Button type="submit" size="sm" variant="primary">
                      Start live
                    </Button>
                  </form>
                ) : null}
                {s.status === 'live' ? (
                  <form action={endSession}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      End live
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
          {!sessions.length ? <li style={{ opacity: 0.6 }}>Chưa có phiên.</li> : null}
        </ul>
      </Panel>

      {active ? (
        <>
          <Panel title={`Comment feed — ${active.title}`}>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Status <Badge>{active.status}</Badge> · viewers {active.viewers_current} · comments{' '}
              {active.comments_count}
            </p>
            {active.status === 'live' ? (
              <form action={ingestComment} style={{ display: 'grid', gap: 8, maxWidth: 480, marginBottom: 16 }}>
                <input type="hidden" name="session_id" value={active.id} />
                <input name="body" defaultValue="Chốt SERUM1 giúp mình" style={{ padding: 8 }} />
                <input name="author_name" defaultValue="Viewer Lan" style={{ padding: 8 }} />
                <select name="payment_method" defaultValue="COD" style={{ padding: 8 }}>
                  <option value="COD">COD</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
                <Button type="submit" variant="primary">
                  Ingest comment → keyword order
                </Button>
              </form>
            ) : null}
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {(active.comments as Array<{
                id: string;
                author_name: string;
                body: string;
                status: string;
                matched_keyword: string | null;
                order_id: string | null;
              }> || []).map((c) => (
                <li key={c.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  <strong>{c.author_name}</strong>: {c.body}
                  <div style={{ opacity: 0.7 }}>
                    {c.status}
                    {c.matched_keyword ? ` · kw ${c.matched_keyword}` : ''}
                    {c.order_id ? (
                      <>
                        {' '}
                        · <Link href="/orders">order {c.order_id.slice(0, 12)}…</Link>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Alerts tồn">
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {(active.alerts as Array<{
                id: string;
                severity: string;
                message: string;
                resolved: boolean;
                type: string;
              }> || []).map((a) => (
                <li key={a.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  <Badge>{a.severity}</Badge> <Badge>{a.type}</Badge> {a.message}
                  {a.resolved ? ' · resolved' : ''}
                </li>
              ))}
              {!(active.alerts as unknown[])?.length ? (
                <li style={{ opacity: 0.6 }}>Chưa có alert.</li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="Post-live recovery">
            <p style={{ fontSize: 13 }}>Pending / TRANSFER: {recovery?.count ?? 0}</p>
            <ul style={{ fontSize: 13 }}>
              {(recovery?.items || []).map((i) => (
                <li key={i.order_id}>
                  {i.order_id} · {i.total} · {i.payment_status}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </>
  );
}
