import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

type Template = {
  id: string;
  code: string;
  name: string;
  industry: string;
  goal: string;
  license: string;
  scores: { cvr?: number; mobile?: number; seo?: number };
  features: string[];
  playbook?: string[];
};

async function installTemplate(code: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/templates/${code}/install`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'theme_match',
    done: true,
  });
  revalidatePath('/website/templates');
  revalidatePath('/website/themes');
  redirect(`/website/templates?installed=${encodeURIComponent(code)}`);
}

async function runMatch(formData: FormData) {
  'use server';
  const industry = String(formData.get('industry') || '');
  const goal = String(formData.get('goal') || '');
  const budget = String(formData.get('budget') || 'free');
  const q = new URLSearchParams({
    industry,
    goal,
    budget,
    matched: '1',
  });
  redirect(`/website/templates?${q.toString()}`);
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const industry = typeof sp.industry === 'string' ? sp.industry : '';
  const goal = typeof sp.goal === 'string' ? sp.goal : '';
  const sort = typeof sp.sort === 'string' ? sp.sort : 'cvr';
  const installed = typeof sp.installed === 'string' ? sp.installed : '';
  const budget = typeof sp.budget === 'string' ? sp.budget : 'free';
  const matched = sp.matched === '1';

  let templates: Template[] = [];
  let matches: {
    matches: Array<{ score: number; reasons: string[]; template: { code: string; name: string } }>;
    playbook: string[];
  } | null = null;
  let error = '';
  try {
    const qs = new URLSearchParams();
    if (industry) qs.set('industry', industry);
    if (goal) qs.set('goal', goal);
    if (sort) qs.set('sort', sort);
    const qstr = qs.toString();
    templates = await apiGet(`/v1/admin/templates${qstr ? `?${qstr}` : ''}`);
    matches = await apiJson(`/v1/admin/templates/match`, 'POST', {
      industry: industry || 'beauty',
      goal: goal || 'conversion',
      budget,
      catalog_size: 12,
      style: 'sticky-atc',
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const installedTpl = installed ? templates.find((t) => t.code === installed) : null;
  const industries = Array.from(new Set(templates.map((t) => t.industry))).sort();

  return (
    <>
      <PageHeader
        title="Template Marketplace"
        description="30 Conversion Playbooks — lọc ngành, sắp xếp CVR/Mobile/SEO, AI Match (rules)"
        actions={<Badge tone="accent">A1 · mockup 04</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      {installedTpl ? (
        <Panel title={`Conversion Playbook · ${installedTpl.name}`}>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Đã cài <code>{installedTpl.code}</code> — checklist sau install:
          </p>
          <ol style={{ fontSize: 13, lineHeight: 1.7 }}>
            {(installedTpl.playbook || []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <p style={{ fontSize: 13 }}>
            Tiếp: <a href="/website/themes">Theme Library</a> ·{' '}
            <a href="/website/domains">Domain / SSL</a> · <a href="/website/golive">Go-live</a>
          </p>
        </Panel>
      ) : null}

      <Panel title="AI Theme Matchmaker">
        <form action={runMatch} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>
            Industry
            <select name="industry" defaultValue={industry || 'beauty'} style={{ display: 'block', marginTop: 4 }}>
              <option value="">Tất cả</option>
              {['beauty', 'fashion', 'fnb', 'b2b', 'edu', 'home', 'electronics', 'social'].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            Goal
            <select name="goal" defaultValue={goal || 'conversion'} style={{ display: 'block', marginTop: 4 }}>
              <option value="conversion">conversion</option>
              <option value="lead">lead</option>
              <option value="local">local</option>
              <option value="brand">brand</option>
              <option value="campaign">campaign</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            Budget
            <select name="budget" defaultValue={budget} style={{ display: 'block', marginTop: 4 }}>
              <option value="free">free</option>
              <option value="paid">paid</option>
            </select>
          </label>
          <div style={{ alignSelf: 'end' }}>
            <Button type="submit" variant="primary">
              Match
            </Button>
          </div>
        </form>
        {matched || matches ? (
          <>
            <ul style={{ fontSize: 13 }}>
              {(matches?.matches || []).slice(0, 5).map((m) => (
                <li key={m.template.code}>
                  <strong>{m.template.name}</strong> · score {m.score} · {m.reasons.join(', ')}
                </li>
              ))}
            </ul>
            <ol style={{ fontSize: 13 }}>
              {(matches?.playbook || []).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </>
        ) : null}
      </Panel>

      <Panel title={`Catalog (${templates.length})`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, fontSize: 12 }}>
          <a href="/website/templates?sort=cvr">Sort CVR</a>
          <a href="/website/templates?sort=mobile">Sort Mobile</a>
          <a href="/website/templates?sort=seo">Sort SEO</a>
          {industries.map((i) => (
            <a key={i} href={`/website/templates?industry=${i}&sort=${sort}`}>
              {i}
            </a>
          ))}
          <a href="/website/templates">All</a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {templates.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid var(--ptt-line, #e5e2dc)',
                borderRadius: 10,
                padding: 14,
                background: '#fff',
              }}
            >
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                {t.industry} · {t.goal} · {t.license}
              </div>
              <div style={{ fontSize: 12, marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge tone="accent">CVR {t.scores?.cvr ?? '—'}</Badge>
                <Badge>Mobile {t.scores?.mobile ?? '—'}</Badge>
                <Badge>SEO {t.scores?.seo ?? '—'}</Badge>
              </div>
              <form action={installTemplate.bind(null, t.code)}>
                <Button type="submit" variant="primary">
                  Install
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
