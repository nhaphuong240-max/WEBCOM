import Link from 'next/link';
import { Badge, Button, Kpi, PageHeader, Panel } from '@ptt/ui';
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

function formatSessions(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 1 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

function formatVndCompact(n: number) {
  if (n >= 1_000_000_000) return `₫${(n / 1_000_000_000).toFixed(2)} tỷ`.replace(/\.00/, '');
  if (n >= 1_000_000) return `₫${Math.round(n / 1_000_000)}tr`;
  if (n >= 1000) return `₫${Math.round(n / 1000)}k`;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

function cwvTone(metric: 'lcp' | 'inp' | 'cls', value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'var(--ptt-ink-3)';
  if (metric === 'lcp') return value > 2500 ? 'var(--ptt-danger)' : 'var(--ptt-signal)';
  if (metric === 'inp') return value > 200 ? 'var(--ptt-danger)' : 'var(--ptt-signal)';
  return value > 0.1 ? 'var(--ptt-danger)' : 'var(--ptt-signal)';
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
  const lcp = dash?.cwv.latest?.lcp_ms;
  const inp = dash?.cwv.latest?.inp_ms;
  const cls = dash?.cwv.latest?.cls;
  const sessions = dash?.kpis.sessions ?? 0;
  const aov = dash?.kpis.aov ?? 0;
  const contrib = dash?.kpis.web_contribution ?? 0;
  const cvr = dash?.kpis.purchase_cvr ?? 0;

  return (
    <>
      <PageHeader
        title="Conversion gắn doanh thu & margin"
        description="Funnel chuẩn + contribution theo landing — không dừng ở bounce rate."
        actions={
          dash?.cwv?.regression ? (
            <Badge tone="warn">
              CWV regression sau publish
              {dash.cwv.lcp_delta_pct ? ` (+${dash.cwv.lcp_delta_pct}% LCP)` : ''}
            </Badge>
          ) : (
            <Badge tone="muted">7 ngày · {SF}</Badge>
          )
        }
      />

      {error ? (
        <Panel title="API">
          <p style={{ color: 'var(--ptt-danger)', margin: 0 }}>{error}</p>
        </Panel>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
        className="analytics-kpi-row"
      >
        <Kpi
          label="Sessions"
          value={sessions ? formatSessions(sessions) : '—'}
          delta={sessions ? '↑ traffic web' : undefined}
        />
        <Kpi
          label="Purchase CVR"
          value={cvr ? `${cvr}%` : '—'}
          delta={cvr ? 'vs funnel purchase' : undefined}
        />
        <Kpi
          label="Web contribution"
          value={contrib ? `${contrib}%` : '—'}
          delta="Sau return"
          emphasis
        />
        <Kpi
          label="AOV"
          value={aov ? formatVndCompact(aov) : '—'}
          delta={aov ? '↑ bundle' : undefined}
        />
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
        className="analytics-grid-2"
      >
        <Panel title="Funnel 7 ngày">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(dash?.funnel || []).map((f) => {
              const pct = Math.round((f.unique_sessions / maxFunnel) * 100);
              return (
                <div
                  key={f.step}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 56px',
                    gap: 10,
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{f.step}</span>
                  <div
                    style={{
                      height: 28,
                      background: 'var(--ptt-paper-2)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <i
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--ptt-ink), var(--ptt-accent))',
                      }}
                    />
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
                </div>
              );
            })}
            {!dash?.funnel?.length ? (
              <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)', margin: 0 }}>Chưa có sự kiện funnel.</p>
            ) : null}
          </div>
          {dash?.funnel_insight ? (
            <p style={{ fontSize: 12, color: 'var(--ptt-ink-3)', margin: '14px 0 0' }}>
              {dash.funnel_insight}
            </p>
          ) : null}
          <p style={{ fontSize: 11, color: 'var(--ptt-ink-3)', margin: '8px 0 0' }}>
            sink <strong>{dash?.coverage.funnel_source || dash?.coverage.sink || '—'}</strong>
            {dash?.coverage.ch_coverage_pct != null
              ? ` · CH coverage ${dash.coverage.ch_coverage_pct}%`
              : ''}
            {dash?.coverage.funnel_from_ch_ok ? ' · funnel≥95% CH' : ''}
            {dash?.coverage.dual_write_ok === false ? ' · dual-write lag' : ''}
          </p>
        </Panel>

        <Panel
          title="Core Web Vitals · Mobile homepage"
          action={
            <Link href="/website/golive" style={{ fontSize: 12, color: 'var(--ptt-accent)', fontWeight: 600 }}>
              Mở checklist
            </Link>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {[
              {
                lab: 'LCP',
                val: lcp != null ? `${(lcp / 1000).toFixed(1)}s` : '—',
                color: cwvTone('lcp', lcp),
              },
              {
                lab: 'INP',
                val: inp != null ? `${inp}ms` : '—',
                color: cwvTone('inp', inp ?? undefined),
              },
              {
                lab: 'CLS',
                val: cls != null ? String(cls) : '—',
                color: cwvTone('cls', cls ?? undefined),
              },
            ].map((m) => (
              <div
                key={m.lab}
                style={{
                  background: 'var(--ptt-paper)',
                  borderRadius: 8,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--ptt-ink-3)' }}>{m.lab}</span>
                <strong
                  style={{
                    display: 'block',
                    fontFamily: 'var(--ptt-font-display)',
                    fontSize: 22,
                    marginTop: 4,
                    color: m.color,
                  }}
                >
                  {m.val}
                </strong>
              </div>
            ))}
          </div>

          {dash?.cwv?.regression ? (
            <p
              style={{
                fontSize: 12,
                color: 'var(--ptt-danger)',
                margin: '14px 0 0',
                fontWeight: 600,
              }}
            >
              Regression vs baseline LCP{' '}
              {dash.cwv.baseline?.lcp_ms != null
                ? `${(dash.cwv.baseline.lcp_ms / 1000).toFixed(1)}s`
                : '—'}
              . Chặn publish — xem Go-live.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--ptt-ink-3)', margin: '14px 0 0' }}>
              Baseline LCP{' '}
              {dash?.cwv.baseline?.lcp_ms != null
                ? `${(dash.cwv.baseline.lcp_ms / 1000).toFixed(1)}s`
                : '—'}
              · chưa có regression.
            </p>
          )}

          <form action={runHealth} style={{ marginTop: 12 }}>
            <Button type="submit" variant="ghost" size="sm">
              Chạy publish health window
            </Button>
          </form>

          {(dash?.incidents || []).length > 0 ? (
            <ul style={{ fontSize: 12, margin: '12px 0 0', paddingLeft: 18, color: 'var(--ptt-ink-3)' }}>
              {dash!.incidents.map((i) => (
                <li key={i.id}>
                  {i.kind} · {i.severity} · {i.status}
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>

      <Panel title="Landing · Revenue & Margin">
        <table
          style={{
            width: '100%',
            fontSize: 13,
            borderCollapse: 'collapse',
            margin: '-4px 0',
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ptt-ink-3)', fontSize: 11 }}>
              <th style={{ padding: '10px 8px', fontWeight: 600 }}>Page</th>
              <th style={{ padding: '10px 8px', fontWeight: 600 }}>Sessions</th>
              <th style={{ padding: '10px 8px', fontWeight: 600 }}>CVR</th>
              <th style={{ padding: '10px 8px', fontWeight: 600 }}>Revenue</th>
              <th style={{ padding: '10px 8px', fontWeight: 600 }}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {(dash?.landings || []).map((l) => {
              const lowMargin = l.contribution < 25;
              return (
                <tr key={l.path} style={{ borderTop: '1px solid var(--ptt-paper-2)' }}>
                  <td style={{ padding: '12px 8px', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {l.path}
                  </td>
                  <td style={{ padding: '12px 8px' }}>{formatSessions(l.sessions)}</td>
                  <td style={{ padding: '12px 8px' }}>{l.cvr}%</td>
                  <td style={{ padding: '12px 8px' }}>{formatVndCompact(l.revenue)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <strong style={{ color: lowMargin ? 'var(--ptt-danger)' : undefined }}>
                      {l.contribution}%
                    </strong>
                  </td>
                </tr>
              );
            })}
            {!dash?.landings?.length ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: 'var(--ptt-ink-3)' }}>
                  Chưa có landing data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: 'var(--ptt-ink-3)', margin: '12px 0 0' }}>
          Contribution ≈ revenue ×{' '}
          {((dash?.coverage.contribution_rate_assumed || 0.42) * 100).toFixed(0)}% (cost allocation
          cơ bản)
        </p>
      </Panel>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, marginTop: 16 }}
        className="analytics-secondary"
      >
        <Panel title="Experiments">
          <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
            {experiments.map((e) => (
              <li key={e.code} style={{ marginBottom: 6 }}>
                {e.name} <span style={{ color: 'var(--ptt-ink-3)' }}>({e.code})</span> ·{' '}
                <Badge tone={e.status === 'running' ? 'signal' : 'muted'}>{e.status}</Badge>
              </li>
            ))}
            {!experiments.length ? (
              <li style={{ color: 'var(--ptt-ink-3)' }}>Chưa có experiment — seed hero_cta_v1</li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="AI assist (guardrailed)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <form action={genHeadlines}>
              <Button type="submit" variant="ghost" size="sm">
                Headline variants
              </Button>
            </form>
            <form action={genExplain}>
              <Button type="submit" variant="ghost" size="sm">
                Theme match explain
              </Button>
            </form>
            <form action={askQa}>
              <Button type="submit" variant="ghost" size="sm">
                Shopping Q&A
              </Button>
            </form>
          </div>
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
            {aiActions.slice(0, 5).map((a) => (
              <li
                key={a.id}
                style={{ borderTop: '1px solid var(--ptt-paper-2)', padding: '10px 0' }}
              >
                <Badge tone={a.risk === 'high' ? 'warn' : 'muted'}>{a.risk}</Badge>{' '}
                <strong>{a.kind}</strong> · {a.status}
                <div style={{ opacity: 0.8, marginTop: 4, fontSize: 12 }}>
                  {a.output?.explanation ||
                    a.output?.answer_draft ||
                    (a.output?.variants || []).join(' · ') ||
                    a.output?.guardrail}
                </div>
                {a.status === 'pending_approval' ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <form action={reviewAi.bind(null, a.id, 'approved')}>
                      <Button type="submit" variant="primary" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={reviewAi.bind(null, a.id, 'rejected')}>
                      <Button type="submit" variant="ghost" size="sm">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
            {!aiActions.length ? (
              <li style={{ color: 'var(--ptt-ink-3)', fontSize: 12 }}>Chưa có AI action.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .analytics-kpi-row,
          .analytics-grid-2,
          .analytics-secondary {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
