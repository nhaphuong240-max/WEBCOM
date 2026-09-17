import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function saveHome(formData: FormData) {
  'use server';
  const expected = Number(formData.get('expected_version') || 0);
  const headline = String(formData.get('headline') || '');
  const eyebrow = String(formData.get('eyebrow') || '');
  const cta = String(formData.get('cta') || 'Mua ngay');
  const ctaHref = String(formData.get('cta_href') || '/search');
  const trust = String(formData.get('trust') || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  await apiJson(`/v1/admin/storefronts/${SF}/pages/home`, 'PUT', {
    expected_version: expected || undefined,
    create_if_missing: true,
    content: {
      section_order: ['hero', 'trust', 'featured'],
      hero: { eyebrow, headline, cta, cta_href: ctaHref },
      trust,
    },
    seo: {
      title: headline,
      description: `${eyebrow} — ${headline}`,
    },
  });
  revalidatePath('/website/builder');
}

export default async function BuilderPage() {
  let draft: {
    version?: number;
    content?: {
      hero?: Record<string, string>;
      trust?: string[];
      section_order?: string[];
    };
  } | null = null;
  let sections: { sections: Array<{ key: string; label: string }> } | null = null;
  let pages: Array<{ slug: string; title: string; status: string }> = [];
  let error = '';
  try {
    sections = await apiGet('/v1/admin/builder/sections');
    pages = await apiGet(`/v1/admin/storefronts/${SF}/pages`);
    draft = await apiGet(`/v1/admin/storefronts/${SF}/pages/home`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const hero = draft?.content?.hero || {};
  const trust = (draft?.content?.trust || []).join(' | ');

  return (
    <>
      <PageHeader
        title="Visual Site Builder"
        description="Section allowlist · autosave draft · optimistic concurrency"
        actions={<Badge tone="accent">W3 · mockup 06</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Section library">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(sections?.sections || []).map((s) => (
            <Badge key={s.key}>{s.label}</Badge>
          ))}
        </div>
      </Panel>

      <Panel title="Pages">
        <ul style={{ fontSize: 13 }}>
          {pages.map((p) => (
            <li key={p.slug}>
              /{p.slug} — {p.title} · {p.status}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={`Edit home (draft v${draft?.version ?? '—'})`}>
        <form action={saveHome} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <input type="hidden" name="expected_version" value={draft?.version ?? 0} />
          <label style={{ fontSize: 13 }}>
            Eyebrow
            <input name="eyebrow" defaultValue={hero.eyebrow || ''} style={{ width: '100%', padding: 8 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Headline
            <input
              name="headline"
              defaultValue={hero.headline || ''}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            CTA
            <input name="cta" defaultValue={hero.cta || 'Mua ngay'} style={{ width: '100%', padding: 8 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            CTA href
            <input
              name="cta_href"
              defaultValue={hero.cta_href || '/products/glow-serum-30ml'}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Trust (phân tách |)
            <input name="trust" defaultValue={trust} style={{ width: '100%', padding: 8 }} />
          </label>
          <Button type="submit" variant="primary">
            Autosave draft
          </Button>
        </form>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Publish qua Go-live checklist — Builder không auto-publish.
        </p>
      </Panel>
    </>
  );
}
