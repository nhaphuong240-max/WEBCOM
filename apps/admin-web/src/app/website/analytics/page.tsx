import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function runHealth() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/health-window`, 'POST', {});
  revalidatePath('/website/analytics');
}

async function genHeadlines() {
  'use server';
  await apiJson(`/v1/admin/ai/actions`, 'POST', {
    storefront_id: SF,
    kind: 'headline_variants',
    payload: { headline: 'Serum tái tạo da đêm' },
  });
  revalidatePath('/website/analytics');
}

async function genExplain() {
  'use server';
  await apiJson(`/v1/admin/ai/actions`, 'POST', {
    storefront_id: SF,
    kind: 'theme_match_explain',
    payload: { industry: 'beauty', goal: 'conversion', budget: 'free' },
  });
  revalidatePath('/website/analytics');
}

async function askQa() {
  'use server';
  await apiJson(`/v1/admin/ai/actions`, 'POST', {
    storefront_id: SF,
    kind: 'shopping_qa',
    payload: { question: 'Serum có đổi trả được không?' },
  });
  revalidatePath('/website/analytics');
}

async function reviewAi(id: string, decision: 'approved' | 'rejected') {
  'use server';
  await apiJson(`/v1/admin/ai/actions/${id}/review`, 'POST', {
    decision,
    note: decision === 'approved' ? 'Approved for draft use' : 'Rejected by merchant',
  });
  revalidatePath('/website/analytics');
}

export default async function AnalyticsPage() {
  let dash: {
    kpis: {
      sessions: number;
      purchase_cvr: number;
      web_contribution: number;
      aov: number;
      revenue: number;
      orders: number;
    };
    funnel: Array<{ step: string; count: number; unique_sessions: number }>;
    funnel_insight: string;
    landings: Array<{
      path: string;
      sessions: number;
      cvr: number;
      revenue: number;
      contribution: number;
    }>;
    cwv: {
      regression: boolean;
      lcp_delta_pct: number;
      latest: { lcp_ms: number; inp_ms?: number | null; cls?: number | null } | null;
      baseline: { lcp_ms: number } | null;
    };
    incidents: Array<{ id: string; kind: string; severity: string; status: string }>;
    coverage: {
      published_tracked: boolean;
      contribution_rate_assumed: number;
      funnel_source?: string;
      ch_coverage_pct?: number;
      funnel_from_ch_ok?: boolean;
      dual_write_ok?: boolean;
      sink?: string;
    };
  } | null = null;
  let experiments: Array<{ code: string; name: string; status: string }> = [];
  let aiActions: Array<{
    id: string;
    kind: string;
    risk: string;
    status: string;
    output: { explanation?: string; variants?: string[]; answer_draft?: string; guardrail?: string };
  }> = [];
  let error = '';
  try {
    dash = await apiGet(`/v1/admin/storefronts/${SF}/analytics?days=7`);
    experiments = await apiGet(`/v1/admin/storefronts/${SF}/experiments`);
    aiActions = await apiGet(`/v1/admin/ai/actions?storefront_id=${SF}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const maxFunnel = Math.max(...(dash?.funnel.map((f) => f.unique_sessions) || [1]), 1);

  return (
    <>
      <PageHeader
        title="Web Analytics"
        description="Conversion gắn doanh thu & contribution margin"
        actions={<Badge tone="accent">A6 · AI Gateway</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      {dash?.cwv?.regression ? (
        <Panel title="Cảnh báo">
          <Badge tone="warn">CWV regression sau publish (+{dash.cwv.lcp_delta_pct}% LCP)</Badge>
        </Panel>
      ) : null}

      <Panel title="KPI 7 ngày">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
          }}
        >
          {[
            ['Sessions', dash?.kpis.sessions],
            ['Purchase CVR', `${dash?.kpis.purchase_cvr ?? 0}%`],
            ['Web contribution', dash?.kpis.web_contribution],
            ['AOV', dash?.kpis.aov],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <div style={{ fontSize: 11, opacity: 0.65 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{val ?? '—'}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Contribution ≈ revenue × {((dash?.coverage.contribution_rate_assumed || 0.42) * 100).toFixed(0)}%
          (cost allocation cơ bản) · sink{' '}
          <strong>{dash?.coverage.funnel_source || dash?.coverage.sink || '—'}</strong>
          {dash?.coverage.ch_coverage_pct != null
            ? ` · CH coverage ${dash.coverage.ch_coverage_pct}%`
            : ''}
          {dash?.coverage.funnel_from_ch_ok ? ' · funnel≥95% CH' : ''}
          {dash?.coverage.dual_write_ok === false ? ' · dual-write lag' : ''}
        </p>
      </Panel>

      <Panel title="Funnel">
        <p style={{ fontSize: 13 }}>{dash?.funnel_insight}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(dash?.funnel || []).map((f) => (
            <div key={f.step} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 48px', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span>{f.step}</span>
              <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(f.unique_sessions / maxFunnel) * 100}%`,
                    height: '100%',
                    background: 'var(--ptt-accent, #c45a6a)',
                  }}
                />
              </div>
              <span>{f.unique_sessions}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="CWV">
        <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
          <div>
            LCP <strong>{dash?.cwv.latest?.lcp_ms?.toFixed?.(0) ?? '—'}ms</strong>
          </div>
          <div>
            INP <strong>{dash?.cwv.latest?.inp_ms ?? '—'}ms</strong>
          </div>
          <div>
            CLS <strong>{dash?.cwv.latest?.cls ?? '—'}</strong>
          </div>
          <div>
            Baseline <strong>{dash?.cwv.baseline?.lcp_ms?.toFixed?.(0) ?? '—'}ms</strong>
          </div>
        </div>
        <form action={runHealth} style={{ marginTop: 12 }}>
          <Button type="submit" variant="ghost">
            Chạy publish health window
          </Button>
        </form>
        {(dash?.incidents || []).length > 0 ? (
          <ul style={{ fontSize: 13 }}>
            {dash!.incidents.map((i) => (
              <li key={i.id}>
                {i.kind} · {i.severity} · {i.status}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel title="Landing contribution">
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Page</th>
              <th>Sessions</th>
              <th>CVR</th>
              <th>Revenue</th>
              <th>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {(dash?.landings || []).map((l) => (
              <tr key={l.path} style={{ borderTop: '1px solid #eee' }}>
                <td>{l.path}</td>
                <td>{l.sessions}</td>
                <td>{l.cvr}%</td>
                <td>{l.revenue}</td>
                <td>
                  <strong>{l.contribution}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Experiments">
        <ul style={{ fontSize: 13 }}>
          {experiments.map((e) => (
            <li key={e.code}>
              {e.name} ({e.code}) · {e.status}
            </li>
          ))}
          {!experiments.length ? <li>Chưa có experiment — seed hero_cta_v1</li> : null}
        </ul>
      </Panel>

      <Panel title="AI assist (guardrailed)">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <form action={genHeadlines}>
            <Button type="submit" variant="ghost">
              Headline variants
            </Button>
          </form>
          <form action={genExplain}>
            <Button type="submit" variant="ghost">
              Theme match explain
            </Button>
          </form>
          <form action={askQa}>
            <Button type="submit" variant="ghost">
              Shopping Q&A (high-risk)
            </Button>
          </form>
        </div>
        <ul style={{ fontSize: 13, listStyle: 'none', padding: 0 }}>
          {aiActions.slice(0, 8).map((a) => (
            <li key={a.id} style={{ borderTop: '1px solid #eee', padding: '10px 0' }}>
              <Badge tone={a.risk === 'high' ? 'warn' : 'muted'}>{a.risk}</Badge>{' '}
              <strong>{a.kind}</strong> · {a.status}
              <div style={{ opacity: 0.8, marginTop: 4 }}>
                {a.output?.explanation ||
                  a.output?.answer_draft ||
                  (a.output?.variants || []).join(' · ') ||
                  a.output?.guardrail}
              </div>
              {a.status === 'pending_approval' ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <form action={reviewAi.bind(null, a.id, 'approved')}>
                    <Button type="submit" variant="primary">
                      Approve
                    </Button>
                  </form>
                  <form action={reviewAi.bind(null, a.id, 'rejected')}>
                    <Button type="submit" variant="ghost">
                      Reject
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
