import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '../../../lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

export default async function AnalyticsPage() {
  let events: Array<{ name: string; payload: unknown; created_at: string }> = [];
  let error = '';
  try {
    events = await apiGet(`/v1/admin/storefronts/${SF}/events?limit=100`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.name] = (acc[e.name] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Web Analytics"
        description="W2 funnel events: view_item, add_to_cart, purchase (raw Postgres)."
        actions={<Badge tone="accent">W2</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Counts">
        <pre style={{ fontSize: 13 }}>{JSON.stringify(counts, null, 2)}</pre>
      </Panel>
      <Panel title="Raw">
        <pre style={{ fontSize: 11, maxHeight: 420, overflow: 'auto' }}>
          {JSON.stringify(events.slice(0, 40), null, 2)}
        </pre>
      </Panel>
    </>
  );
}
