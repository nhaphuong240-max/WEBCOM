import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function submitDelivery(formData: FormData) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/agency/deliveries`, 'POST', {
    title: String(formData.get('title') || 'Agency delivery'),
    agency_name: String(formData.get('agency_name') || 'Partner Agency'),
    notes: String(formData.get('notes') || ''),
  });
  revalidatePath('/website/agency');
}

async function transition(id: string, status: string) {
  'use server';
  await apiJson(`/v1/admin/agency/deliveries/${id}/transition`, 'POST', { status });
  revalidatePath('/website/agency');
}

async function createApiKeyAction() {
  'use server';
  await apiJson(`/v1/headless/admin/api-keys`, 'POST', {
    name: `Headless ${new Date().toISOString().slice(0, 10)}`,
    storefront_id: SF,
  });
  revalidatePath('/website/agency');
}

export default async function AgencyPage() {
  let deliveries: Array<{
    id: string;
    title: string;
    agency_name: string;
    status: string;
    white_label_host?: string | null;
    preview_token?: string | null;
  }> = [];
  let keys: Array<{ id: string; name: string; key_prefix: string; status: string }> = [];
  let error = '';
  try {
    deliveries = await apiGet(`/v1/admin/storefronts/${SF}/agency/deliveries`);
    keys = await apiGet(`/v1/headless/admin/api-keys`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Agency & Headless"
        description="Delivery workflow · white-label preview · API keys"
        actions={<Badge tone="accent">W5</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Submit delivery">
        <form action={submitDelivery} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="title" placeholder="Title" defaultValue="AURA restyle Q3" style={{ padding: 8 }} />
          <input name="agency_name" placeholder="Agency" defaultValue="Pixel Partner" style={{ padding: 8 }} />
          <input name="notes" placeholder="Notes" style={{ padding: 8 }} />
          <Button type="submit" variant="primary">
            Submit
          </Button>
        </form>
      </Panel>

      <Panel title="Deliveries">
        <ul style={{ fontSize: 13, listStyle: 'none', padding: 0 }}>
          {deliveries.map((d) => (
            <li key={d.id} style={{ borderTop: '1px solid #eee', padding: '10px 0' }}>
              <strong>{d.title}</strong> · {d.agency_name} · <Badge>{d.status}</Badge>
              <div style={{ opacity: 0.7 }}>
                Host: {d.white_label_host || '—'} · token: {d.preview_token?.slice(0, 8) || '—'}…
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {['in_review', 'accepted', 'installed', 'staging', 'published'].map((s) => (
                  <form key={s} action={transition.bind(null, d.id, s)}>
                    <Button type="submit" variant="ghost">
                      → {s}
                    </Button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Headless API keys">
        <ul style={{ fontSize: 13 }}>
          {keys.map((k) => (
            <li key={k.id}>
              {k.name} · <code>{k.key_prefix}…</code> · {k.status}
            </li>
          ))}
        </ul>
        <form action={createApiKeyAction}>
          <Button type="submit" variant="primary">
            Create API key
          </Button>
        </form>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Secret chỉ trả về một lần qua API <code>POST /v1/headless/admin/api-keys</code>.
        </p>
      </Panel>
    </>
  );
}
