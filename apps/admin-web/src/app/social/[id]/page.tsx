import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';
const DEFAULT_SKU = process.env.NEXT_PUBLIC_SKU_ID || 'sku_aura_glow_30';

type Message = {
  id: string;
  direction: string;
  body: string;
  author_name: string;
  message_kind?: string;
  post_id?: string | null;
  created_at: string;
};

type Detail = {
  id: string;
  contact_name: string;
  contact_handle: string;
  status: string;
  owner_id: string | null;
  tags: string[];
  notes: string;
  sla_status: string;
  external_thread_id?: string;
  channel?: { provider: string; channel_type: string; display_name: string };
  messages: Message[];
};

type ProductPick = {
  product_id: string;
  product_title: string;
  sku_id: string;
  sku_code: string;
  unit_price: string | null;
  available: number;
};

type Draft = {
  id: string;
  status: string;
  source: string;
  risk_score: number;
  risk_flags: string[];
  subtotal: string;
  currency: string;
  external_thread_id: string;
  order_id: string | null;
  payment_method: string;
  lines: Array<{ product_title: string; qty: number; unit_price: string; sku_code: string }>;
  messenger_cart?: { cart_url?: string } | null;
};

async function assign(formData: FormData) {
  'use server';
  const id = String(formData.get('conversation_id'));
  const tagsRaw = String(formData.get('tags') || '');
  await apiJson(`/v1/admin/social/inbox/${id}/assign`, 'POST', {
    owner_id: String(formData.get('owner_id') || 'agent_cskh') || null,
    tags: tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    notes: String(formData.get('notes') || ''),
    status: String(formData.get('status') || 'open'),
  });
  revalidatePath(`/social/${id}`);
  revalidatePath('/social');
}

async function reply(formData: FormData) {
  'use server';
  const id = String(formData.get('conversation_id'));
  await apiJson(`/v1/admin/social/inbox/${id}/reply`, 'POST', {
    body: String(formData.get('body') || ''),
  });
  revalidatePath(`/social/${id}`);
  revalidatePath('/social');
}

async function createDraft(formData: FormData) {
  'use server';
  const id = String(formData.get('conversation_id'));
  const skuId = String(formData.get('sku_id') || DEFAULT_SKU);
  const qty = Number(formData.get('qty') || 1);
  const source = String(formData.get('source') || 'chat') as 'chat' | 'comment';
  const messageId = String(formData.get('message_id') || '') || undefined;
  await apiJson(`/v1/admin/social/inbox/${id}/drafts`, 'POST', {
    message_id: messageId,
    source,
    storefront_id: SF,
    lines: [{ sku_id: skuId, qty }],
    shipping_name: String(formData.get('shipping_name') || 'Khách Social'),
    shipping_phone: String(formData.get('shipping_phone') || '0901234567'),
    shipping_address: String(formData.get('shipping_address') || '1 Nguyen Hue'),
    shipping_city: String(formData.get('shipping_city') || 'HCM'),
    payment_method: String(formData.get('payment_method') || 'COD'),
    note: 'B2 admin draft',
  });
  revalidatePath(`/social/${id}`);
}

async function sendCart(formData: FormData) {
  'use server';
  const convId = String(formData.get('conversation_id'));
  const draftId = String(formData.get('draft_id'));
  await apiJson(`/v1/admin/social/drafts/${draftId}/send-cart`, 'POST', {});
  revalidatePath(`/social/${convId}`);
}

async function convertDraft(formData: FormData) {
  'use server';
  const convId = String(formData.get('conversation_id'));
  const draftId = String(formData.get('draft_id'));
  await apiJson(`/v1/admin/social/drafts/${draftId}/convert`, 'POST', {
    payment_method: String(formData.get('payment_method') || 'COD'),
    shipping_name: String(formData.get('shipping_name') || 'Khách Social'),
    shipping_phone: String(formData.get('shipping_phone') || '0901234567'),
    shipping_address: String(formData.get('shipping_address') || '1 Nguyen Hue'),
    shipping_city: String(formData.get('shipping_city') || 'HCM'),
  });
  revalidatePath(`/social/${convId}`);
  revalidatePath('/orders');
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  let detail: Detail | null = null;
  let products: ProductPick[] = [];
  let drafts: Draft[] = [];
  let error = '';
  try {
    detail = await apiGet(`/v1/admin/social/inbox/${params.id}`);
    const prod = await apiGet<{ items: ProductPick[] }>('/v1/admin/social/products?q=glow');
    products = prod.items || [];
    drafts = await apiGet(`/v1/admin/social/drafts?conversation_id=${params.id}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!detail && !error) notFound();

  const commentMsg = detail?.messages.find((m) => m.message_kind === 'comment' && m.direction === 'inbound');

  return (
    <>
      <PageHeader
        title={detail?.contact_name || 'Conversation'}
        description={`${detail?.channel?.provider || ''}/${detail?.channel?.channel_type || ''} · thread ${detail?.external_thread_id || '—'}`}
        actions={
          <Link href="/social" style={{ fontSize: 13 }}>
            ← Inbox
          </Link>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      {detail ? (
        <>
          <Panel title="Thread meta">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, marginBottom: 12 }}>
              <Badge>{detail.status}</Badge>
              <Badge tone="accent">SLA {detail.sla_status}</Badge>
              <span>Owner: {detail.owner_id || '—'}</span>
              <span>Tags: {(detail.tags || []).join(', ') || '—'}</span>
            </div>
            <form action={assign} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
              <input type="hidden" name="conversation_id" value={detail.id} />
              <input name="owner_id" defaultValue={detail.owner_id || 'agent_cskh'} placeholder="owner_id" style={{ padding: 8 }} />
              <input
                name="tags"
                defaultValue={(detail.tags || []).join(', ') || 'lead, vip'}
                placeholder="tags (comma)"
                style={{ padding: 8 }}
              />
              <input name="notes" defaultValue={detail.notes || ''} placeholder="notes" style={{ padding: 8 }} />
              <select name="status" defaultValue={detail.status} style={{ padding: 8 }}>
                <option value="open">open</option>
                <option value="pending">pending</option>
                <option value="closed">closed</option>
              </select>
              <Button type="submit" variant="primary">
                Assign owner / tags / SLA
              </Button>
            </form>
          </Panel>

          <Panel title="B2 — Comment / chat → Order draft">
            <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)', marginBottom: 12 }}>
              Product snapshot + channel thread ID (BR-023) · convert → OMS CONFIRMED + reserve tồn.
            </p>
            <form
              action={createDraft}
              style={{ display: 'grid', gap: 8, maxWidth: 560, gridTemplateColumns: '1fr 1fr' }}
            >
              <input type="hidden" name="conversation_id" value={detail.id} />
              {commentMsg ? <input type="hidden" name="message_id" value={commentMsg.id} /> : null}
              <label style={{ fontSize: 12, display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
                SKU
                <select name="sku_id" defaultValue={products[0]?.sku_id || DEFAULT_SKU} style={{ padding: 8 }}>
                  {(products.length ? products : [{ sku_id: DEFAULT_SKU, product_title: 'Glow Serum', sku_code: 'AURA-GLOW-30', unit_price: null, available: 0, product_id: '' }]).map(
                    (p) => (
                      <option key={p.sku_id} value={p.sku_id}>
                        {p.product_title} · {p.sku_code} · {p.unit_price || '?'} · avail {p.available}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                Qty
                <input name="qty" type="number" min={1} defaultValue={1} style={{ padding: 8 }} />
              </label>
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                Source
                <select name="source" defaultValue={commentMsg ? 'comment' : 'chat'} style={{ padding: 8 }}>
                  <option value="chat">chat</option>
                  <option value="comment">comment</option>
                </select>
              </label>
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                Pay
                <select name="payment_method" defaultValue="COD" style={{ padding: 8 }}>
                  <option value="COD">COD</option>
                  <option value="TRANSFER">TRANSFER (QR)</option>
                </select>
              </label>
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                Phone
                <input name="shipping_phone" defaultValue="0901234567" style={{ padding: 8 }} />
              </label>
              <label style={{ fontSize: 12, display: 'grid', gap: 4, gridColumn: '1 / -1' }}>
                Address
                <input name="shipping_address" defaultValue="1 Nguyen Hue, Q1" style={{ padding: 8 }} />
              </label>
              <input type="hidden" name="shipping_name" value={detail.contact_name || 'Khách Social'} />
              <input type="hidden" name="shipping_city" value="HCM" />
              <Button type="submit" variant="primary">
                Tạo order draft
              </Button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
              {drafts.map((d) => (
                <li
                  key={d.id}
                  style={{
                    borderTop: '1px solid var(--ptt-line)',
                    padding: '12px 0',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.id}</strong>
                    <Badge tone="accent">{d.status}</Badge>
                    <Badge>{d.source}</Badge>
                    <span>
                      {d.subtotal} {d.currency}
                    </span>
                    <span>risk {d.risk_score}</span>
                    {d.order_id ? <span>order {d.order_id}</span> : null}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    thread {d.external_thread_id} ·{' '}
                    {(d.lines || []).map((l) => `${l.qty}× ${l.product_title}`).join(', ')}
                    {d.risk_flags?.length ? ` · flags: ${d.risk_flags.join(',')}` : ''}
                  </div>
                  {d.messenger_cart?.cart_url ? (
                    <div style={{ fontSize: 12, marginTop: 4 }}>Cart stub: {d.messenger_cart.cart_url}</div>
                  ) : null}
                  {d.status === 'draft' || d.status === 'cart_sent' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {d.status === 'draft' ? (
                        <form action={sendCart}>
                          <input type="hidden" name="conversation_id" value={detail.id} />
                          <input type="hidden" name="draft_id" value={d.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Gửi giỏ Messenger (stub)
                          </Button>
                        </form>
                      ) : null}
                      <form action={convertDraft} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="hidden" name="conversation_id" value={detail.id} />
                        <input type="hidden" name="draft_id" value={d.id} />
                        <input type="hidden" name="shipping_name" value={detail.contact_name || 'Khách Social'} />
                        <input type="hidden" name="shipping_phone" value="0901234567" />
                        <input type="hidden" name="shipping_address" value="1 Nguyen Hue, Q1" />
                        <input type="hidden" name="shipping_city" value="HCM" />
                        <select name="payment_method" defaultValue={d.payment_method || 'COD'} style={{ padding: 6 }}>
                          <option value="COD">COD</option>
                          <option value="TRANSFER">TRANSFER</option>
                        </select>
                        <Button type="submit" size="sm" variant="primary">
                          Convert → Order
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
              {!drafts.length ? (
                <li style={{ opacity: 0.6, paddingTop: 8 }}>Chưa có draft — chọn SKU và tạo.</li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="Messages">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {detail.messages.map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background:
                      m.direction === 'inbound' ? 'var(--ptt-surface)' : 'rgba(0,0,0,0.04)',
                    border: '1px solid var(--ptt-line)',
                    marginLeft: m.direction === 'outbound' ? 48 : 0,
                    marginRight: m.direction === 'inbound' ? 48 : 0,
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>
                    {m.direction} · {m.message_kind || 'chat'}
                    {m.post_id ? ` · post ${m.post_id}` : ''} · {m.author_name || '—'} ·{' '}
                    {new Date(m.created_at).toLocaleString('vi-VN')}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                </li>
              ))}
            </ul>
            <form action={reply} style={{ display: 'grid', gap: 8, marginTop: 16, maxWidth: 560 }}>
              <input type="hidden" name="conversation_id" value={detail.id} />
              <textarea name="body" rows={3} placeholder="Trả lời stub…" defaultValue="Dạ shop còn hàng ạ!" style={{ padding: 8 }} />
              <Button type="submit" variant="primary">
                Reply (stub)
              </Button>
            </form>
          </Panel>
        </>
      ) : null}
    </>
  );
}
