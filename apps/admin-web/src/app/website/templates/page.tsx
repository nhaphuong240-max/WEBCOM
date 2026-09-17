import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function installTemplate(code: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/templates/${code}/install`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'theme_match',
    done: true,
  });
  revalidatePath('/website/templates');
  revalidatePath('/website/themes');
}

export default async function TemplatesPage() {
  let templates: Array<{
    id: string;
    code: string;
    name: string;
    industry: string;
    goal: string;
    license: string;
    scores: { cvr?: number; mobile?: number; seo?: number };
    features: string[];
  }> = [];
  let matches: {
    matches: Array<{ score: number; reasons: string[]; template: { code: string; name: string } }>;
    playbook: string[];
  } | null = null;
  let error = '';
  try {
    templates = await apiGet('/v1/admin/templates');
    matches = await apiJson(`/v1/admin/templates/match`, 'POST', {
      industry: 'beauty',
      goal: 'conversion',
      budget: 'free',
      catalog_size: 12,
      style: 'sticky-atc',
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Template Marketplace"
        description="Catalog playbook chất — AI Matchmaker (rules)"
        actions={<Badge tone="accent">W3 · mockup 04</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="AI Theme Matchmaker">
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Input: beauty · conversion · free — top matches:
        </p>
        <ul style={{ fontSize: 13 }}>
          {(matches?.matches || []).slice(0, 3).map((m) => (
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
      </Panel>

      <Panel title={`Catalog (${templates.length})`}>
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
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                CVR {t.scores?.cvr ?? '—'} · Mobile {t.scores?.mobile ?? '—'} · SEO{' '}
                {t.scores?.seo ?? '—'}
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
