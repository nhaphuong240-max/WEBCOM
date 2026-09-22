import { PageHeader, Panel, Badge } from '@ptt/ui';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { apiGet, apiJson } from '@/lib/api';
import { MegaNavEditor, type MegaNavItem } from './MegaNavEditor';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function searchCatalogAction(mode: 'products' | 'collection', q: string) {
  'use server';
  if (mode === 'products') {
    const rows = await apiGet<
      Array<{ id: string; title: string; slug?: string; media?: Array<{ url: string }> }>
    >(`/v1/admin/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    return (rows || []).slice(0, 20).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      image: r.media?.[0]?.url,
    }));
  }
  const nav = await apiGet<
    Array<{ handle: string; items: Array<{ label: string; href: string }> }>
  >(`/v1/admin/storefronts/${SF}/navigation`).catch(() => []);
  const fromNav = (nav || [])
    .flatMap((n) => n.items || [])
    .filter((i) => i.href?.includes('/collections/'))
    .map((i) => {
      const slug = i.href.split('/collections/')[1]?.split('?')[0] || '';
      return { id: slug, title: i.label, slug };
    })
    .filter((c) => c.slug);
  const fallback = [
    { id: 'noi-bat', title: 'Nổi bật', slug: 'noi-bat' },
    { id: 'moi', title: 'Mới', slug: 'moi' },
    { id: 'serum-dem', title: 'Serum đêm', slug: 'serum-dem' },
    { id: 'lam-sang', title: 'Làm sáng', slug: 'lam-sang' },
  ];
  const map = new Map<string, { id: string; title: string; slug: string }>();
  for (const c of [...fromNav, ...fallback]) map.set(c.slug, c);
  const needle = q.trim().toLowerCase();
  return [...map.values()]
    .filter(
      (c) =>
        !needle ||
        c.slug.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle),
    )
    .slice(0, 20);
}

async function saveHeaderNav(items: MegaNavItem[]) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/navigation/header`, 'PUT', { items });
  revalidatePath('/website/nav');
  return items;
}

export default async function WebsiteNavPage() {
  let items: MegaNavItem[] = [];
  let error = '';
  try {
    const nav = await apiGet<Array<{ handle: string; items: MegaNavItem[] }>>(
      `/v1/admin/storefronts/${SF}/navigation`,
    );
    items = (nav.find((n) => n.handle === 'header')?.items as MegaNavItem[]) || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  if (!items.length) {
    items = [
      {
        label: 'Serum đêm',
        href: '/collections/serum-dem',
        mega: {
          columns: [
            {
              title: 'Serum',
              links: [
                { label: 'Serum đêm', href: '/collections/serum-dem' },
                { label: 'Làm sáng', href: '/collections/lam-sang' },
              ],
            },
          ],
          featured_collections: [{ slug: 'serum-dem', title: 'Serum đêm' }],
          featured_products: [],
        },
      },
      { label: 'Làm sáng', href: '/collections/lam-sang' },
    ];
  }

  return (
    <>
      <PageHeader
        title="Navigation · Mega menu"
        description="FR-017 · gắn collection + sản phẩm nổi bật vào menu header (desktop)."
        actions={<Badge tone="accent">PRO-C2 · PC2-8</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Header mega merch">
        <p style={{ fontSize: 13, color: 'var(--ptt-muted)', marginTop: 0 }}>
          Mục có mega panel hiện dropdown trên storefront (≥900px). Link SF:{' '}
          <Link href="/website/collections">Bộ sưu tập</Link> ·{' '}
          <Link href="/products">Sản phẩm</Link>.
        </p>
        <MegaNavEditor
          initialItems={items}
          saveAction={saveHeaderNav}
          searchCatalogAction={searchCatalogAction}
        />
      </Panel>
    </>
  );
}
