import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function publishStaging() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/ensure-aura-lite`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/status`, 'POST', {
    status: 'staging',
    primary_domain: 'webecom.ngoinhahomnay.vn',
    seo_title: 'AURA Beauty · Serum tái tạo da đêm',
  });
}

async function publishLive() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/status`, 'POST', { status: 'published' });
}

export default async function ThemesPage() {
  let runtime: unknown = null;
  let events: Array<{ name: string; created_at: string }> = [];
  let error = '';
  try {
    runtime = await apiGet(`/v1/storefronts/${SF}/runtime`);
    events = await apiGet(`/v1/admin/storefronts/${SF}/events?limit=20`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Theme & Storefront"
        description="W2 — Aura Commerce Lite, publish states, events funnel."
        actions={<Badge tone="accent">W2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Runtime">
        <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(runtime, null, 2)}</pre>
        <form action={publishStaging} style={{ display: 'inline-block', marginRight: 8 }}>
          <Button type="submit" variant="ghost">
            Ensure Aura Lite + Staging
          </Button>
        </form>
        <form action={publishLive} style={{ display: 'inline-block' }}>
          <Button type="submit" variant="primary">
            Publish
          </Button>
        </form>
      </Panel>
      <Panel title="Events gần đây">
        <ul style={{ fontSize: 13 }}>
          {events.map((e, i) => (
            <li key={i}>
              {e.name} · {e.created_at}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
