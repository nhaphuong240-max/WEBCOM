import { PageHeader, Panel, Badge, Button, Input } from '@ptt/ui';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { apiGet, apiJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';
const DEMO_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/$/, '') ||
  process.env.DEMO_PUBLIC_URL?.replace(/\/$/, '') ||
  'https://themes.ngoinhahomnay.vn';

type PageRow = {
  slug: string;
  title: string;
  status: string;
  template_key?: string;
  versions?: Array<{ version: number; status: string }>;
};

type MerchDraft = {
  version?: number;
  status?: string;
  content_v1?: {
    sections?: Record<string, { type?: string; props?: Record<string, unknown> }>;
  };
  content?: Record<string, unknown>;
  seo?: { title?: string; description?: string };
};

function collectionSlugFromPage(pageSlug: string) {
  return pageSlug.startsWith('collection--') ? pageSlug.slice('collection--'.length) : pageSlug;
}

function readBannerProps(draft: MerchDraft | null) {
  const sections = draft?.content_v1?.sections || {};
  const banner = Object.values(sections).find((s) => s.type === 'collection_banner');
  const props = (banner?.props || {}) as Record<string, string>;
  return {
    title: props.title || '',
    intro: props.intro || '',
    banner_url: props.banner_url || '',
    empty_copy: props.empty_copy || '',
    seo_title: draft?.seo?.title || '',
    seo_description: draft?.seo?.description || '',
    version: draft?.version || 0,
    status: draft?.status || 'draft',
  };
}

async function saveCollectionMerch(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^\/+|\/+$/g, '');
  if (!slug) return;
  const title = String(formData.get('title') || slug);
  const intro = String(formData.get('intro') || '');
  const banner = String(formData.get('banner_url') || '');
  const emptyCopy = String(formData.get('empty_copy') || '');
  const seoTitle = String(formData.get('seo_title') || title);
  const seoDescription = String(formData.get('seo_description') || intro);
  const publish = formData.get('publish') === '1';
  const pageSlug = `collection--${slug}`;

  try {
    await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
      slug: pageSlug,
      title: `Collection · ${title}`,
      template_key: 'collection_merch',
    });
  } catch {
    /* exists */
  }

  const draft = await apiGet<MerchDraft>(
    `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}`,
  ).catch(() => ({ version: 0 } as MerchDraft));

  await apiJson(`/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}`, 'PUT', {
    expected_version: draft.version || undefined,
    create_if_missing: true,
    template_key: 'collection_merch',
    title: `Collection · ${title}`,
    content: {
      schema_version: 1,
      section_order: ['collection_banner'],
      sections: {
        collection_banner: {
          type: 'collection_banner',
          id: 'sec_col_banner',
          props: {
            title,
            intro,
            banner_url: banner,
            empty_copy: emptyCopy,
            collection_slug: slug,
          },
          style: {},
        },
      },
    },
    seo: { title: seoTitle, description: seoDescription },
  });

  if (publish) {
    await apiJson(
      `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}/promote`,
      'POST',
      { target: 'published' },
    );
  }

  revalidatePath('/website/collections');
}

export default async function CollectionsMerchPage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const editSlug = (sp.slug || '').trim().toLowerCase();

  let pages: PageRow[] = [];
  let nav: Array<{ handle: string; items: Array<{ label: string; href: string }> }> = [];
  let error = '';
  try {
    pages = await apiGet(`/v1/admin/storefronts/${SF}/pages`);
    nav = await apiGet(`/v1/admin/storefronts/${SF}/navigation`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const fromNav = (nav || [])
    .flatMap((n) => n.items || [])
    .filter((i) => i.href?.includes('/collections/'))
    .map((i) => {
      const slug = i.href.split('/collections/')[1]?.split(/[?#]/)[0] || '';
      return { slug, title: i.label };
    })
    .filter((c) => c.slug);

  const fromPages = pages
    .filter((p) => p.slug.startsWith('collection--') || p.template_key === 'collection_merch')
    .map((p) => ({
      slug: collectionSlugFromPage(p.slug),
      title: p.title.replace(/^Collection( merch)? · /, ''),
      status: p.status,
      pageSlug: p.slug.startsWith('collection--') ? p.slug : `collection--${p.slug}`,
    }));

  const fallback = [
    { slug: 'noi-bat', title: 'Nổi bật' },
    { slug: 'moi', title: 'Mới' },
    { slug: 'serum-dem', title: 'Serum đêm' },
    { slug: 'lam-sang', title: 'Làm sáng' },
  ];

  const map = new Map<
    string,
    { slug: string; title: string; status?: string; pageSlug?: string }
  >();
  for (const c of [...fallback, ...fromNav, ...fromPages]) {
    const prev = map.get(c.slug);
    map.set(c.slug, {
      slug: c.slug,
      title: c.title || prev?.title || c.slug,
      status: 'status' in c ? (c as { status?: string }).status || prev?.status : prev?.status,
      pageSlug:
        'pageSlug' in c
          ? (c as { pageSlug?: string }).pageSlug || prev?.pageSlug
          : prev?.pageSlug || `collection--${c.slug}`,
    });
  }
  const catalog = [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));

  let edit: ReturnType<typeof readBannerProps> & { slug: string } | null = null;
  if (editSlug) {
    const pageSlug = `collection--${editSlug}`;
    const draft = await apiGet<MerchDraft>(
      `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}`,
    ).catch(() => null);
    const base = catalog.find((c) => c.slug === editSlug);
    const props = readBannerProps(draft);
    edit = {
      slug: editSlug,
      title: props.title || base?.title || editSlug,
      intro: props.intro,
      banner_url: props.banner_url,
      empty_copy: props.empty_copy,
      seo_title: props.seo_title || props.title || base?.title || editSlug,
      seo_description: props.seo_description,
      version: props.version,
      status: props.status || base?.status || '—',
    };
  }

  return (
    <>
      <PageHeader
        title="Bộ sưu tập · Merch"
        description="Banner / intro / SEO collection (FR-013). SKU quản lý tại /products."
        actions={<Badge tone="accent">PRO-C2 · PC2-1</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Danh sách collection">
        <p style={{ fontSize: 13, color: 'var(--ptt-muted)', marginTop: 0 }}>
          Gồm collection từ nav + page merch đã lưu. Chọn để sửa banner/SEO.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
                <th style={{ padding: '8px 6px' }}>Slug</th>
                <th style={{ padding: '8px 6px' }}>Tiêu đề</th>
                <th style={{ padding: '8px 6px' }}>Merch</th>
                <th style={{ padding: '8px 6px' }} />
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => {
                const page = pages.find((p) => p.slug === `collection--${c.slug}`);
                const hasMerch = !!page;
                const published = page?.versions?.some((v) => v.status === 'published');
                const status = published ? 'published' : page?.status || '—';
                return (
                  <tr key={c.slug} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <code>{c.slug}</code>
                    </td>
                    <td style={{ padding: '8px 6px' }}>{c.title}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <Badge tone={published ? 'signal' : hasMerch ? 'accent' : 'muted'}>
                        {hasMerch ? status : 'chưa có'}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                      <Link href={`/website/collections?slug=${encodeURIComponent(c.slug)}`}>
                        Sửa
                      </Link>
                      {' · '}
                      <a href={`${DEMO_URL}/collections/${c.slug}`} target="_blank" rel="noreferrer">
                        SF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={edit ? `Sửa merch · ${edit.slug}` : 'Tạo / gán merch mới'}>
        <form action={saveCollectionMerch} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <Input
            name="slug"
            placeholder="collection slug (vd. serum-dem)"
            required
            defaultValue={edit?.slug || ''}
            readOnly={!!edit}
          />
          <Input name="title" placeholder="Tiêu đề hiển thị" defaultValue={edit?.title || ''} />
          <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
            Intro
            <textarea
              name="intro"
              rows={3}
              defaultValue={edit?.intro || ''}
              placeholder="Mô tả ngắn dưới banner"
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--ptt-line)' }}
            />
          </label>
          <Input name="banner_url" placeholder="Banner image URL" defaultValue={edit?.banner_url || ''} />
          <Input
            name="empty_copy"
            placeholder="Empty PLP copy (khi 0 SP)"
            defaultValue={edit?.empty_copy || ''}
          />
          <Input name="seo_title" placeholder="SEO title" defaultValue={edit?.seo_title || ''} />
          <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
            SEO description
            <textarea
              name="seo_description"
              rows={2}
              defaultValue={edit?.seo_description || ''}
              style={{ padding: 8, borderRadius: 8, border: '1px solid var(--ptt-line)' }}
            />
          </label>
          {edit ? (
            <p style={{ fontSize: 12, color: 'var(--ptt-muted)', margin: 0 }}>
              Draft v{edit.version} · status {edit.status}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="submit" variant="ghost" name="publish" value="0">
              Lưu draft
            </Button>
            <button
              type="submit"
              name="publish"
              value="1"
              style={{
                height: 44,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--ptt-accent)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lưu &amp; Publish
            </button>
            {edit ? (
              <Link href="/website/collections" style={{ alignSelf: 'center', fontSize: 13 }}>
                Hủy
              </Link>
            ) : null}
          </div>
        </form>
      </Panel>
    </>
  );
}
