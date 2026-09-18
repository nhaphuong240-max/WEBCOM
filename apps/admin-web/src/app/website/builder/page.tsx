import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';
import { BuilderCanvas, type ContentV1 } from './builder-canvas';

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
  const seoTitle = String(formData.get('seo_title') || headline);
  const seoDescription = String(formData.get('seo_description') || `${eyebrow} — ${headline}`);
  await apiJson(`/v1/admin/storefronts/${SF}/pages/home`, 'PUT', {
    expected_version: expected || undefined,
    create_if_missing: true,
    content: {
      section_order: ['hero', 'trust', 'featured'],
      hero: { eyebrow, headline, cta, cta_href: ctaHref },
      trust,
    },
    seo: {
      title: seoTitle,
      description: seoDescription,
    },
  });
  revalidatePath('/website/builder');
}

async function createStaticPage(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const title = String(formData.get('title') || slug);
  const templateKey = String(formData.get('template_key') || 'static');
  if (!slug) return;
  await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
    slug,
    title,
    template_key: templateKey,
  });
  revalidatePath('/website/builder');
}

async function promotePage(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '');
  const target = String(formData.get('target') || 'published') as 'staging' | 'published';
  if (!slug) return;
  await apiJson(`/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(slug)}/promote`, 'POST', {
    target,
  });
  revalidatePath('/website/builder');
}

async function saveCanvasAction(payload: {
  content: ContentV1;
  seo: { title?: string; description?: string };
  expected_version: number;
}) {
  'use server';
  try {
    const res = await apiJson<{ version: number }>(`/v1/admin/storefronts/${SF}/pages/home`, 'PUT', {
      expected_version: payload.expected_version || undefined,
      create_if_missing: true,
      content: payload.content,
      seo: payload.seo,
    });
    revalidatePath('/website/builder');
    return { version: res.version, ok: true as const };
  } catch (e) {
    return {
      version: payload.expected_version,
      ok: false as const,
      error: e instanceof Error ? e.message : 'Save failed',
    };
  }
}

async function createMediaAction(url: string, alt: string) {
  'use server';
  return apiJson<{ id: string; url: string; alt: string }>('/v1/admin/media', 'POST', {
    url,
    alt,
  });
}

async function saveNavAction(items: Array<{ label: string; href: string }>) {
  'use server';
  const res = await apiJson<{ items: Array<{ label: string; href: string }> }>(
    `/v1/admin/storefronts/${SF}/navigation/header`,
    'PUT',
    { items },
  );
  revalidatePath('/website/builder');
  return (res.items || items) as Array<{ label: string; href: string }>;
}

async function saveBlockAction(input: {
  name: string;
  section_type: string;
  content: { type: string; id: string; props: Record<string, unknown>; style: Record<string, unknown> };
}) {
  'use server';
  const res = await apiJson<{
    id: string;
    name: string;
    section_type: string;
    content: { type: string; id: string; props: Record<string, unknown>; style: Record<string, unknown> };
  }>(`/v1/admin/storefronts/${SF}/saved-blocks`, 'POST', input);
  revalidatePath('/website/builder');
  return res;
}

async function suggestCopyAction(headline: string) {
  'use server';
  return apiJson<{ variants: string[]; draft_only: boolean }>(
    `/v1/admin/storefronts/${SF}/builder/ai-copy`,
    'POST',
    { headline, field: 'headline' },
  );
}

export default async function BuilderPage() {
  let draft: {
    version?: number;
    content?: {
      hero?: Record<string, string>;
      trust?: string[];
      section_order?: string[];
    };
    content_v1?: ContentV1;
    seo?: { title?: string; description?: string };
  } | null = null;
  let sections: {
    sections: Array<{ key: string; label: string; fields: string[] }>;
    cms_builder_canvas?: boolean;
  } | null = null;
  let pages: Array<{ slug: string; title: string; status: string; template_key?: string }> = [];
  let themes: Array<{ code: string; supports?: string[] }> = [];
  let media: Array<{ id: string; url: string; alt: string }> = [];
  let nav: Array<{ handle: string; items: Array<{ label: string; href: string }> }> = [];
  let savedBlocks: Array<{
    id: string;
    name: string;
    section_type: string;
    content: ContentV1['sections'][string];
  }> = [];
  let error = '';
  try {
    sections = await apiGet('/v1/admin/builder/sections');
    pages = await apiGet(`/v1/admin/storefronts/${SF}/pages`);
    draft = await apiGet(`/v1/admin/storefronts/${SF}/pages/home`);
    themes = await apiGet(`/v1/admin/storefronts/${SF}/themes`);
    media = await apiGet('/v1/admin/media');
    nav = await apiGet(`/v1/admin/storefronts/${SF}/navigation`);
    try {
      savedBlocks = await apiGet(`/v1/admin/storefronts/${SF}/saved-blocks`);
    } catch {
      savedBlocks = [];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const canvasOn =
    sections?.cms_builder_canvas !== false &&
    (process.env.FEATURE_CMS_BUILDER_CANVAS ?? 'true') !== 'false' &&
    (process.env.FEATURE_CMS_BUILDER_CANVAS ?? 'true') !== '0';

  const hero = draft?.content?.hero || {};
  const trust = (draft?.content?.trust || []).join(' | ');
  const seo = draft?.seo || {};
  const supports = themes[0]?.supports || [];
  const headerNav =
    (nav.find((n) => n.handle === 'header')?.items as Array<{ label: string; href: string }>) || [];

  const contentV1: ContentV1 = draft?.content_v1?.schema_version
    ? draft.content_v1
    : {
        schema_version: 1,
        section_order: ['hero'],
        sections: {
          hero: {
            type: 'hero',
            id: 'sec_hero',
            props: {
              eyebrow: hero.eyebrow || '',
              headline: hero.headline || 'Headline',
              cta: hero.cta || 'Mua ngay',
              cta_href: hero.cta_href || '/',
            },
            style: {},
          },
        },
      };

  return (
    <>
      <PageHeader
        title="Visual Site Builder"
        description={
          canvasOn
            ? 'CMS-3 · canvas · saved blocks · AI copy draft · blog'
            : 'CMS-1 form · bật FEATURE_CMS_BUILDER_CANVAS để canvas'
        }
        actions={<Badge tone="accent">{canvasOn ? 'CMS-3 · mockup 06' : 'CMS-1 · mockup 06'}</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Pages">
        <ul style={{ fontSize: 13 }}>
          {pages.map((p) => (
            <li
              key={p.slug}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span>
                /{p.slug} — {p.title} · {p.template_key || '—'} · {p.status}
              </span>
              {p.status !== 'published' ? (
                <form action={promotePage} style={{ display: 'inline' }}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <input type="hidden" name="target" value="published" />
                  <Button type="submit" variant="ghost">
                    Publish page
                  </Button>
                </form>
              ) : p.template_key === 'blog_post' ? (
                <span style={{ fontSize: 12, opacity: 0.7 }}>/blog/{p.slug}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <form action={createStaticPage} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input name="slug" placeholder="slug (vd. about)" style={{ padding: 8 }} required />
          <input name="title" placeholder="Tiêu đề" style={{ padding: 8 }} />
          <select name="template_key" defaultValue="static" style={{ padding: 8 }}>
            <option value="static">static</option>
            <option value="blog_post">blog_post</option>
            <option value="landing">landing</option>
          </select>
          <Button type="submit" variant="ghost">
            Tạo page
          </Button>
        </form>
      </Panel>

      {canvasOn && !error ? (
        <Panel title="Builder canvas">
          <BuilderCanvas
            initialContent={contentV1}
            initialVersion={draft?.version || 0}
            initialSeo={seo}
            sections={(sections?.sections || []).map((s) => ({
              key: s.key,
              label: s.label,
              fields: s.fields || [],
            }))}
            supports={supports}
            media={media}
            headerNav={headerNav}
            savedBlocks={savedBlocks.map((b) => ({
              id: b.id,
              name: b.name,
              section_type: b.section_type,
              content: b.content as ContentV1['sections'][string],
            }))}
            saveAction={saveCanvasAction}
            createMediaAction={createMediaAction}
            saveNavAction={saveNavAction}
            saveBlockAction={saveBlockAction}
            suggestCopyAction={suggestCopyAction}
          />
        </Panel>
      ) : (
        <>
          <Panel title="Section library">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(sections?.sections || []).map((s) => (
                <Badge key={s.key}>{s.label}</Badge>
              ))}
            </div>
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
              <label style={{ fontSize: 13 }}>
                SEO title
                <input
                  name="seo_title"
                  defaultValue={seo.title || ''}
                  style={{ width: '100%', padding: 8 }}
                />
              </label>
              <label style={{ fontSize: 13 }}>
                SEO description
                <input
                  name="seo_description"
                  defaultValue={seo.description || ''}
                  style={{ width: '100%', padding: 8 }}
                />
              </label>
              <Button type="submit" variant="primary">
                Autosave draft (ContentV1)
              </Button>
            </form>
          </Panel>
        </>
      )}

      <Panel title="Preview">
        <form
          action={async () => {
            'use server';
            await apiJson(`/v1/admin/storefronts/${SF}/preview-token`, 'POST', { hours: 24 });
            revalidatePath('/website/builder');
          }}
        >
          <Button type="submit" variant="ghost">
            Tạo preview token (24h)
          </Button>
        </form>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          Publish qua Go-live · Demo: <code>?demo=harvest-fnb</code> / <code>?demo=atelier-luxe</code>
        </p>
      </Panel>
    </>
  );
}
