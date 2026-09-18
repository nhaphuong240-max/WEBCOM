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
  if (!slug) return;
  await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
    slug,
    title,
    template_key: 'static',
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
    content_v1?: { schema_version?: number };
    seo?: { title?: string; description?: string };
  } | null = null;
  let sections: { sections: Array<{ key: string; label: string }> } | null = null;
  let pages: Array<{ slug: string; title: string; status: string; template_key?: string }> = [];
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
  const seo = draft?.seo || {};

  return (
    <>
      <PageHeader
        title="Visual Site Builder"
        description="CMS-1 · ContentV1 dual-write · SEO · static pages"
        actions={<Badge tone="accent">CMS-1 · mockup 06</Badge>}
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
        {draft?.content_v1?.schema_version ? (
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            Draft schema_version={draft.content_v1.schema_version}
          </p>
        ) : null}
      </Panel>

      <Panel title="Pages">
        <ul style={{ fontSize: 13 }}>
          {pages.map((p) => (
            <li key={p.slug}>
              /{p.slug} — {p.title} · {p.template_key || '—'} · {p.status}
            </li>
          ))}
        </ul>
        <form action={createStaticPage} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input name="slug" placeholder="slug (vd. about)" style={{ padding: 8 }} required />
          <input name="title" placeholder="Tiêu đề" style={{ padding: 8 }} />
          <Button type="submit" variant="ghost">
            Tạo static page
          </Button>
        </form>
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
        <form
          action={async () => {
            'use server';
            await apiJson(`/v1/admin/storefronts/${SF}/preview-token`, 'POST', { hours: 24 });
            revalidatePath('/website/builder');
          }}
          style={{ marginTop: 12 }}
        >
          <Button type="submit" variant="ghost">
            Tạo preview token (24h)
          </Button>
        </form>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Publish qua Go-live checklist — Builder không auto-publish. Demo package:{' '}
          <code>?demo=lumen-fashion</code> trên themes host.
        </p>
      </Panel>
    </>
  );
}
