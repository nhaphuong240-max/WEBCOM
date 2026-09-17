import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

type Channel = {
  id: string;
  provider: string;
  channel_type: string;
  display_name: string;
  status: string;
  mode: string;
  external_id: string;
};

type Conversation = {
  id: string;
  contact_name: string;
  contact_handle: string;
  status: string;
  owner_id: string | null;
  tags: string[];
  sla_status: string;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  channel?: { provider: string; channel_type: string; display_name: string };
};

async function bindMeta() {
  'use server';
  await apiJson('/v1/admin/social/channels/bind', 'POST', {
    provider: 'meta',
    channel_type: 'messenger',
    storefront_id: SF,
    display_name: 'AURA Meta Messenger',
  });
  revalidatePath('/social');
}

async function bindZalo() {
  'use server';
  await apiJson('/v1/admin/social/channels/bind', 'POST', {
    provider: 'zalo',
    channel_type: 'oa',
    storefront_id: SF,
    display_name: 'AURA Zalo OA',
  });
  revalidatePath('/social');
}

async function disconnectChannel(formData: FormData) {
  'use server';
  const id = String(formData.get('channel_id'));
  await apiJson(`/v1/admin/social/channels/${id}/disconnect`, 'POST', {});
  revalidatePath('/social');
}

async function simulateInbound(formData: FormData) {
  'use server';
  const provider = String(formData.get('provider') || 'meta');
  const channelId = String(formData.get('channel_id') || '');
  await apiJson(`/v1/admin/social/webhooks/${provider}`, 'POST', {
    channel_id: channelId || undefined,
    kind: String(formData.get('kind') || 'chat'),
    post_id: String(formData.get('post_id') || '') || undefined,
    text: String(formData.get('text') || 'Xin chào, mình muốn hỏi sản phẩm'),
    contact_name: String(formData.get('contact_name') || 'Khách demo'),
    thread_id: String(formData.get('thread_id') || `demo_${Date.now()}`),
  });
  revalidatePath('/social');
}

export default async function SocialPage() {
  let channels: Channel[] = [];
  let inbox: Conversation[] = [];
  let status: { wave?: string; connectors?: Record<string, { mode: string }> } | null = null;
  let error = '';
  try {
    status = await apiGet('/v1/admin/social/status');
    channels = await apiGet('/v1/admin/social/channels');
    inbox = await apiGet('/v1/admin/social/inbox?limit=40');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const connected = channels.filter((c) => c.status === 'connected');

  return (
    <>
      <PageHeader
        title="Social Inbox"
        description="B2 — Channel + Inbox + comment/chat → order draft → OMS."
        actions={<Badge tone="accent">B2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Connectors">
        <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)', marginBottom: 12 }}>
          Wave {status?.wave || '—'} · Meta{' '}
          <Badge>{status?.connectors?.meta?.mode || 'stub'}</Badge> · Zalo{' '}
          <Badge>{status?.connectors?.zalo?.mode || 'stub'}</Badge>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <form action={bindMeta}>
            <Button type="submit" variant="primary">
              Bind Meta Messenger
            </Button>
          </form>
          <form action={bindZalo}>
            <Button type="submit" variant="primary">
              Bind Zalo OA
            </Button>
          </form>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Kênh</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Mode</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>
                  <strong>{c.display_name}</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>
                    {c.channel_type} · {c.external_id}
                  </div>
                </td>
                <td>{c.provider}</td>
                <td>
                  <Badge tone={c.status === 'connected' ? 'accent' : undefined}>{c.status}</Badge>
                </td>
                <td>{c.mode}</td>
                <td>
                  {c.status === 'connected' ? (
                    <form action={disconnectChannel}>
                      <input type="hidden" name="channel_id" value={c.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Disconnect
                      </Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {!channels.length ? (
              <tr>
                <td colSpan={5} style={{ padding: 12, opacity: 0.6 }}>
                  Chưa bind kênh — dùng stub Meta + Zalo để đạt exit ≥2 kênh.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>

      <Panel title="Simulate inbound (stub webhook)">
        <form
          action={simulateInbound}
          style={{ display: 'grid', gap: 8, maxWidth: 520, gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}
        >
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Provider
            <select name="provider" defaultValue="meta" style={{ padding: 8 }}>
              <option value="meta">meta</option>
              <option value="zalo">zalo</option>
            </select>
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Kind
            <select name="kind" defaultValue="chat" style={{ padding: 8 }}>
              <option value="chat">chat</option>
              <option value="comment">comment</option>
            </select>
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Channel
            <select name="channel_id" defaultValue={connected[0]?.id || ''} style={{ padding: 8 }}>
              <option value="">auto</option>
              {connected.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Post ID (comment)
            <input name="post_id" defaultValue="post_e2e_1" style={{ padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
            Message
            <input name="text" defaultValue="Cho mình hỏi serum còn hàng không?" style={{ padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Contact
            <input name="contact_name" defaultValue="Lan Nguyen" style={{ padding: 8 }} />
          </label>
          <Button type="submit" variant="primary">
            Ingest message
          </Button>
        </form>
      </Panel>

      <Panel title="Unified Inbox">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Contact</th>
              <th>Channel</th>
              <th>Preview</th>
              <th>SLA</th>
              <th>Owner / Tags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {inbox.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>
                  <strong>{c.contact_name || c.contact_handle || '—'}</strong>
                  {c.unread_count > 0 ? (
                    <span style={{ marginLeft: 6 }}>
                      <Badge tone="accent">{c.unread_count}</Badge>
                    </span>
                  ) : null}
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{c.status}</div>
                </td>
                <td>
                  {c.channel?.provider}/{c.channel?.channel_type}
                </td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.last_message_preview}
                </td>
                <td>
                  <Badge tone={c.sla_status === 'breached' ? undefined : c.sla_status === 'warning' ? 'accent' : undefined}>
                    {c.sla_status}
                  </Badge>
                </td>
                <td style={{ fontSize: 12 }}>
                  {c.owner_id || '—'}
                  <div>{(c.tags || []).join(', ') || 'no tags'}</div>
                </td>
                <td>
                  <Link href={`/social/${c.id}`} style={{ fontSize: 13, color: 'var(--ptt-accent)' }}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!inbox.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.6 }}>
                  Inbox trống — ingest stub message sau khi bind kênh.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
