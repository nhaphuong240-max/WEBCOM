import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Detail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  notes: string;
  addresses: Array<{ label?: string; line1: string; city?: string; phone?: string; is_default?: boolean }>;
  status: string;
  merged_into_id?: string | null;
  rfm?: {
    r: number | null;
    f: number | null;
    m: number | null;
    score: number | null;
    segment: string | null;
    computed_at: string | null;
  };
  loyalty?: {
    account_id: string;
    points_balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
    tier_code: string;
    referral_code: string;
  } | null;
  recovery?: {
    tickets: Array<{
      id: string;
      subject: string;
      status: string;
      priority: string;
      playbook_code: string | null;
      care_reply_draft: string | null;
      created_at: string;
    }>;
    nba: Array<{
      id: string;
      action: string;
      reason: string;
      status: string;
      expected_outcome: string;
      created_at: string;
    }>;
  };
  segments?: Array<{ segment_id: string; name: string; status: string; snapshot_at: string }>;
  identities?: Array<{
    id: string;
    type: string;
    value: string;
    verified: boolean;
    created_at: string;
  }>;
  consent: {
    marketing: boolean;
    email: boolean;
    sms: boolean;
    zns: boolean;
    messenger: boolean;
  };
  lifetime_orders: number;
  lifetime_spend: string;
  last_order_at: string | null;
  orders_summary: { count: number; lifetime_spend: string; last_order_at: string | null };
  orders: Array<{
    id: string;
    status: string;
    total: string;
    payment_method: string;
    attribution_channel: string | null;
    customer_linked: boolean;
    created_at: string;
  }>;
  conversations: Array<{
    id: string;
    status: string;
    contact_name: string;
    last_message_preview: string;
    channel: { provider: string; channel_type: string; display_name: string };
  }>;
};

async function updateProfile(formData: FormData) {
  'use server';
  const id = String(formData.get('customer_id'));
  await apiJson(`/v1/admin/customers/${id}`, 'PATCH', {
    name: String(formData.get('name') || ''),
    tags: String(formData.get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    notes: String(formData.get('notes') || ''),
    addresses: [
      {
        label: 'Primary',
        line1: String(formData.get('address_line1') || ''),
        city: String(formData.get('address_city') || ''),
        phone: String(formData.get('phone') || ''),
        is_default: true,
      },
    ],
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath('/customers');
}

async function updateConsent(formData: FormData) {
  'use server';
  const id = String(formData.get('customer_id'));
  await apiJson(`/v1/admin/customers/${id}/consent`, 'PATCH', {
    consent_marketing: formData.get('consent_marketing') === 'on',
    consent_email: formData.get('consent_email') === 'on',
    consent_sms: formData.get('consent_sms') === 'on',
    consent_zns: formData.get('consent_zns') === 'on',
    consent_messenger: formData.get('consent_messenger') === 'on',
  });
  revalidatePath(`/customers/${id}`);
}

async function linkInbox(formData: FormData) {
  'use server';
  const id = String(formData.get('customer_id'));
  await apiJson(`/v1/admin/customers/${id}/link-inbox`, 'POST', {});
  revalidatePath(`/customers/${id}`);
}

async function addIdentity(formData: FormData) {
  'use server';
  const id = String(formData.get('customer_id'));
  await apiJson(`/v1/admin/customers/${id}/identities`, 'POST', {
    type: String(formData.get('type') || 'meta'),
    value: String(formData.get('value') || ''),
    verified: formData.get('verified') === 'on',
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath('/customers/matches');
}

async function removeIdentity(formData: FormData) {
  'use server';
  const customerId = String(formData.get('customer_id'));
  const identityId = String(formData.get('identity_id'));
  await apiJson(`/v1/admin/customers/${customerId}/identities/${identityId}`, 'DELETE', {});
  revalidatePath(`/customers/${customerId}`);
}

async function openCareTicket(formData: FormData) {
  'use server';
  const customerId = String(formData.get('customer_id'));
  await apiJson('/v1/admin/cx/tickets', 'POST', {
    customer_id: customerId,
    subject: String(formData.get('subject') || 'Care from 360'),
    playbook_code: 'vip_care',
    priority: 'normal',
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/recovery');
}

async function suggestNbaForCustomer(formData: FormData) {
  'use server';
  const customerId = String(formData.get('customer_id'));
  const ticketId = String(formData.get('ticket_id') || '') || undefined;
  await apiJson('/v1/admin/cx/nba/suggest', 'POST', {
    customer_id: customerId,
    ticket_id: ticketId,
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/recovery');
}

export default async function Customer360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail: Detail | null = null;
  let error = '';
  try {
    detail = await apiGet(`/v1/admin/customers/${id}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!detail && !error) notFound();

  const addr = detail?.addresses?.[0];

  return (
    <>
      <PageHeader
        title={detail?.name || 'Customer 360'}
        description={`${detail?.phone || '—'} · ${detail?.email || '—'} · C6 recovery`}
        actions={
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <Link href="/recovery">Recovery</Link>
            <Link href="/loyalty">Loyalty</Link>
            <Link href="/segments">Segments</Link>
            <Link href="/customers/matches">Matches</Link>
            <Link href="/customers">← Customers</Link>
          </div>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      {detail ? (
        <>
          <Panel title="Lifetime">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
              <Badge tone="accent">{detail.status}</Badge>
              {detail.rfm?.segment ? (
                <Badge tone="signal">
                  RFM {detail.rfm.segment} (R{detail.rfm.r} F{detail.rfm.f} M{detail.rfm.m})
                </Badge>
              ) : (
                <span style={{ opacity: 0.6 }}>RFM chưa compute — /segments Refresh</span>
              )}
              {detail.loyalty ? (
                <Badge tone="accent">
                  {detail.loyalty.tier_code} · {detail.loyalty.points_balance} pts · {detail.loyalty.referral_code}
                </Badge>
              ) : (
                <Link href="/loyalty" style={{ fontSize: 12 }}>
                  Open loyalty →
                </Link>
              )}
              {detail.merged_into_id ? (
                <span>
                  Merged into{' '}
                  <Link href={`/customers/${detail.merged_into_id}`}>{detail.merged_into_id}</Link>
                </span>
              ) : null}
              <span>Orders {detail.orders_summary.count}</span>
              <span>Spend {detail.orders_summary.lifetime_spend}</span>
              <span>Last {detail.orders_summary.last_order_at || '—'}</span>
            </div>
            {detail.loyalty ? (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Link href={`/loyalty/${detail.id}`}>View ledger →</Link>
              </div>
            ) : null}
          </Panel>

          {(detail.segments || []).length ? (
            <Panel title="Segments">
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
                {detail.segments!.map((s) => (
                  <li key={s.segment_id} style={{ padding: '4px 0' }}>
                    <Link href={`/segments/${s.segment_id}/members`}>{s.name}</Link>{' '}
                    <Badge tone="muted">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Recovery (C6)">
            <form action={openCareTicket} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input type="hidden" name="customer_id" value={detail.id} />
              <input name="subject" defaultValue="Care from 360" style={{ padding: 8, flex: 1 }} />
              <Button type="submit" size="sm" variant="primary">
                Open ticket
              </Button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, marginBottom: 12 }}>
              {(detail.recovery?.tickets || []).map((t) => (
                <li key={t.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '6px 0' }}>
                  <Badge>{t.status}</Badge> <Badge tone="muted">{t.priority}</Badge> {t.subject}
                  {t.playbook_code ? ` · ${t.playbook_code}` : ''}
                  {t.care_reply_draft ? (
                    <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>{t.care_reply_draft}</div>
                  ) : null}
                  <form action={suggestNbaForCustomer} style={{ marginTop: 4 }}>
                    <input type="hidden" name="customer_id" value={detail.id} />
                    <input type="hidden" name="ticket_id" value={t.id} />
                    <Button type="submit" size="sm">
                      Suggest NBA
                    </Button>
                  </form>
                </li>
              ))}
              {!(detail.recovery?.tickets || []).length ? (
                <li style={{ opacity: 0.6 }}>No tickets — open care or run playbook scan.</li>
              ) : null}
            </ul>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>NBA</div>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {(detail.recovery?.nba || []).map((n) => (
                <li key={n.id} style={{ padding: '4px 0' }}>
                  <Badge tone="accent">{n.action}</Badge> <Badge tone="muted">{n.status}</Badge>{' '}
                  {n.reason}
                </li>
              ))}
              {!(detail.recovery?.nba || []).length ? (
                <li style={{ opacity: 0.6 }}>No NBA yet.</li>
              ) : null}
            </ul>
            <Link href="/recovery" style={{ fontSize: 12 }}>
              Full recovery →
            </Link>
          </Panel>

          <Panel title="Identities (C2)">
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 13 }}>
              {(detail.identities || []).map((i) => (
                <li
                  key={i.id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    borderTop: '1px solid var(--ptt-line)',
                    padding: '6px 0',
                  }}
                >
                  <Badge>{i.type}</Badge>
                  <span>{i.value}</span>
                  {i.verified ? <Badge tone="accent">verified</Badge> : null}
                  <form action={removeIdentity} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="customer_id" value={detail.id} />
                    <input type="hidden" name="identity_id" value={i.id} />
                    <Button type="submit" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
              {!(detail.identities || []).length ? (
                <li style={{ opacity: 0.6 }}>No identities yet — ensure syncs phone/email.</li>
              ) : null}
            </ul>
            <form action={addIdentity} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input type="hidden" name="customer_id" value={detail.id} />
              <select name="type" defaultValue="meta" style={{ padding: 8 }}>
                <option value="meta">meta</option>
                <option value="zalo">zalo</option>
                <option value="shopee">shopee</option>
                <option value="tiktok">tiktok</option>
                <option value="loyalty">loyalty</option>
                <option value="phone">phone</option>
                <option value="email">email</option>
                <option value="other">other</option>
              </select>
              <input name="value" placeholder="PSID / handle / id" required style={{ padding: 8, flex: 1 }} />
              <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
                <input type="checkbox" name="verified" /> verified
              </label>
              <Button type="submit" variant="primary">
                Add identity
              </Button>
            </form>
          </Panel>

          <Panel title="Profile">
            <form action={updateProfile} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
              <input type="hidden" name="customer_id" value={detail.id} />
              <input name="name" defaultValue={detail.name} style={{ padding: 8 }} />
              <input name="phone" defaultValue={detail.phone || ''} style={{ padding: 8 }} />
              <input name="tags" defaultValue={(detail.tags || []).join(', ')} style={{ padding: 8 }} />
              <textarea name="notes" rows={3} defaultValue={detail.notes} style={{ padding: 8 }} />
              <input
                name="address_line1"
                defaultValue={addr?.line1 || ''}
                placeholder="Address line"
                style={{ padding: 8 }}
              />
              <input name="address_city" defaultValue={addr?.city || ''} placeholder="City" style={{ padding: 8 }} />
              <Button type="submit" variant="primary">
                Lưu profile
              </Button>
            </form>
          </Panel>

          <Panel title="Consent (BR-011)">
            <form action={updateConsent} style={{ display: 'grid', gap: 8, maxWidth: 320, fontSize: 13 }}>
              <input type="hidden" name="customer_id" value={detail.id} />
              {(
                [
                  ['consent_marketing', 'Marketing master', detail.consent.marketing],
                  ['consent_email', 'Email', detail.consent.email],
                  ['consent_sms', 'SMS', detail.consent.sms],
                  ['consent_zns', 'ZNS', detail.consent.zns],
                  ['consent_messenger', 'Messenger', detail.consent.messenger],
                ] as const
              ).map(([name, label, checked]) => (
                <label key={name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" name={name} defaultChecked={checked} />
                  {label}
                </label>
              ))}
              <Button type="submit">Lưu consent</Button>
            </form>
          </Panel>

          <Panel title="Orders">
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {detail.orders.map((o) => (
                <li key={o.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  <Link href="/orders">{o.id}</Link> · {o.status} · {o.total} · {o.payment_method}
                  {o.attribution_channel ? ` · ${o.attribution_channel}` : ''}
                  {!o.customer_linked ? ' · guest-phone match' : ''}
                </li>
              ))}
              {!detail.orders.length ? <li style={{ opacity: 0.6 }}>Chưa có đơn.</li> : null}
            </ul>
          </Panel>

          <Panel title="Inbox linked">
            <form action={linkInbox} style={{ marginBottom: 12 }}>
              <input type="hidden" name="customer_id" value={detail.id} />
              <Button type="submit" size="sm">
                Link inbox by phone
              </Button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {detail.conversations.map((c) => (
                <li key={c.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  <Link href={`/social/${c.id}`}>{c.contact_name || c.id}</Link> ·{' '}
                  {c.channel.provider}/{c.channel.channel_type} · <Badge>{c.status}</Badge>
                  <div style={{ opacity: 0.7 }}>{c.last_message_preview}</div>
                </li>
              ))}
              {!detail.conversations.length ? (
                <li style={{ opacity: 0.6 }}>Chưa link conversation — thử Link inbox by phone.</li>
              ) : null}
            </ul>
          </Panel>
        </>
      ) : null}
    </>
  );
}
