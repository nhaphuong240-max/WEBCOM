import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Segment = {
  id: string;
  name: string;
  description: string;
  logic: string;
  status: string;
  member_count: number;
  last_materialized_at: string | null;
  rules: Array<{ id: string; field: string; op: string; value: unknown; window_days: number | null }>;
};

type RfmSummary = {
  total_scored: number;
  by_segment: Record<string, number>;
  last_job: { id: string; customers_scored: number; started_at: string } | null;
};

type Preview = {
  count: number;
  sample: Array<{ id: string; name: string; phone: string | null; rfm_segment: string | null }>;
};

async function refreshRfm() {
  'use server';
  await apiJson('/v1/admin/crm/rfm/refresh', 'POST', {});
  revalidatePath('/segments');
  revalidatePath('/customers');
}

async function createSegment(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || 'VIP email');
  const logic = String(formData.get('logic') || 'AND');
  const field = String(formData.get('field') || 'rfm_segment');
  const op = String(formData.get('op') || 'eq');
  const valueRaw = String(formData.get('value') || 'Champions');
  let value: unknown = valueRaw;
  if (valueRaw === 'true' || valueRaw === 'false') value = valueRaw === 'true';
  else if (!Number.isNaN(Number(valueRaw)) && valueRaw.trim() !== '') value = Number(valueRaw);

  await apiJson('/v1/admin/segments', 'POST', {
    name,
    description: String(formData.get('description') || ''),
    logic,
    status: 'draft',
    rules: [{ field, op, value }],
  });
  revalidatePath('/segments');
}

async function materializeSegment(formData: FormData) {
  'use server';
  const id = String(formData.get('segment_id'));
  await apiJson(`/v1/admin/segments/${id}/materialize`, 'POST', {});
  revalidatePath('/segments');
  revalidatePath('/customers');
}

async function deleteSegment(formData: FormData) {
  'use server';
  const id = String(formData.get('segment_id'));
  await apiJson(`/v1/admin/segments/${id}`, 'DELETE', {});
  revalidatePath('/segments');
}

export default async function SegmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const sp = await searchParams;
  let segments: Segment[] = [];
  let rfm: RfmSummary | null = null;
  let preview: Preview | null = null;
  let status: { wave: string } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/crm/status');
    rfm = await apiGet('/v1/admin/crm/rfm/summary');
    segments = await apiGet('/v1/admin/segments');
    if (sp.preview) {
      preview = await apiJson(`/v1/admin/segments/${sp.preview}/preview`, 'POST', {});
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Segments"
        description="C3 — RFM scoring + rule segments (AND/OR) · preview · materialize."
        actions={<Badge tone="accent">{status?.wave || 'C3'}</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="RFM">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <form action={refreshRfm}>
            <Button type="submit" variant="primary">
              Refresh RFM job
            </Button>
          </form>
          <span style={{ fontSize: 13 }}>
            Scored {rfm?.total_scored ?? 0}
            {rfm?.last_job ? ` · last ${rfm.last_job.started_at.slice(0, 19)}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
          {Object.entries(rfm?.by_segment || {}).map(([k, v]) => (
            <Badge key={k} tone="muted">
              {k}: {v}
            </Badge>
          ))}
          {!Object.keys(rfm?.by_segment || {}).length ? (
            <span style={{ opacity: 0.6 }}>Chưa có RFM — bấm Refresh.</span>
          ) : null}
        </div>
      </Panel>

      <Panel title="Tạo segment">
        <form action={createSegment} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <input name="name" defaultValue="Champions email" style={{ padding: 8 }} />
          <input name="description" defaultValue="RFM Champions + consent email" style={{ padding: 8 }} />
          <select name="logic" defaultValue="AND" style={{ padding: 8 }}>
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select name="field" defaultValue="rfm_segment" style={{ padding: 8 }}>
              <option value="rfm_segment">rfm_segment</option>
              <option value="rfm_r">rfm_r</option>
              <option value="rfm_f">rfm_f</option>
              <option value="rfm_m">rfm_m</option>
              <option value="lifetime_orders">lifetime_orders</option>
              <option value="lifetime_spend">lifetime_spend</option>
              <option value="consent_email">consent_email</option>
              <option value="tags">tags (has_tag)</option>
              <option value="last_order_days">last_order_days</option>
            </select>
            <select name="op" defaultValue="eq" style={{ padding: 8 }}>
              <option value="eq">eq</option>
              <option value="neq">neq</option>
              <option value="gte">gte</option>
              <option value="lte">lte</option>
              <option value="gt">gt</option>
              <option value="lt">lt</option>
              <option value="has_tag">has_tag</option>
              <option value="in">in</option>
            </select>
            <input name="value" defaultValue="Champions" style={{ padding: 8, flex: 1 }} />
          </div>
          <Button type="submit" variant="primary">
            Create segment
          </Button>
        </form>
      </Panel>

      <Panel title={`Segments (${segments.length})`}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16 }}>
          {segments.map((s) => (
            <li
              key={s.id}
              style={{ borderTop: '1px solid var(--ptt-line, #ddd)', paddingTop: 12, fontSize: 13 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong>{s.name}</strong>
                <Badge tone="accent">{s.status}</Badge>
                <Badge>{s.logic}</Badge>
                <span>
                  members {s.member_count}
                  {s.last_materialized_at ? ` · ${s.last_materialized_at.slice(0, 19)}` : ''}
                </span>
              </div>
              {s.description ? <div style={{ opacity: 0.7, marginTop: 4 }}>{s.description}</div> : null}
              <ul style={{ margin: '8px 0', paddingLeft: 16, opacity: 0.85 }}>
                {s.rules.map((r) => (
                  <li key={r.id}>
                    {r.field} {r.op} {JSON.stringify(r.value)}
                    {r.window_days != null ? ` (window ${r.window_days}d)` : ''}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link href={`/segments?preview=${s.id}`}>
                  <Button type="button" size="sm">
                    Preview
                  </Button>
                </Link>
                <form action={materializeSegment}>
                  <input type="hidden" name="segment_id" value={s.id} />
                  <Button type="submit" size="sm" variant="primary">
                    Materialize
                  </Button>
                </form>
                <form action={deleteSegment}>
                  <input type="hidden" name="segment_id" value={s.id} />
                  <Button type="submit" size="sm">
                    Delete
                  </Button>
                </form>
                <Link href={`/segments/${s.id}/members`} style={{ fontSize: 12, alignSelf: 'center' }}>
                  Members →
                </Link>
              </div>
            </li>
          ))}
          {!segments.length ? <li style={{ opacity: 0.6 }}>Chưa có segment.</li> : null}
        </ul>
      </Panel>

      {preview ? (
        <Panel title={`Preview · count ${preview.count}`}>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
            {preview.sample.map((c) => (
              <li key={c.id} style={{ padding: '4px 0', borderTop: '1px solid var(--ptt-line, #ddd)' }}>
                <Link href={`/customers/${c.id}`}>{c.name || c.phone || c.id}</Link>
                {c.rfm_segment ? ` · ${c.rfm_segment}` : ''}
              </li>
            ))}
            {!preview.sample.length ? <li style={{ opacity: 0.6 }}>Empty audience.</li> : null}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
