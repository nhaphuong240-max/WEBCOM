import { PageHeader, Panel, Badge, Button, Input } from '@ptt/ui';
import { revalidatePath } from 'next/cache';
import { apiGet, apiJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function saveCollectionMerch(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '').trim();
  if (!slug) return;
  const title = String(formData.get('title') || slug);
  const banner = String(formData.get('banner_url') || '');
  const seoTitle = String(formData.get('seo_title') || title);
  const seoDescription = String(formData.get('seo_description') || '');
  // Store merch override as a CMS page slug collection--{slug}
  const pageSlug = `collection--${slug}`;
  try {
    await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
      slug: pageSlug,
      title: `Collection merch · ${title}`,
      template_key: 'collection_merch',
    });
  } catch {
    /* may exist */
  }
  const draft = await apiGet<{ version?: number; content?: Record<string, unknown> }>(
    `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}`,
  ).catch(() => ({ version: 0, content: {} }));
  await apiJson(`/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(pageSlug)}`, 'PUT', {
    expected_version: draft.version || undefined,
    create_if_missing: true,
    content: {
      schema_version: 1,
      section_order: ['collection_banner'],
      sections: {
        collection_banner: {
          type: 'collection_banner',
          id: 'sec_col_banner',
          props: { title, banner_url: banner, collection_slug: slug },
          style: {},
        },
      },
    },
    seo: { title: seoTitle, description: seoDescription },
  });
  revalidatePath('/website/collections');
}

export default async function CollectionsMerchPage() {
  return (
    <>
      <PageHeader
        title="Bộ sưu tập · Merch"
        description="Banner / SEO collection (FR-013). Sản phẩm quản lý tại /products."
        actions={<Badge tone="accent">PRO-C2</Badge>}
      />
      <Panel title="Gán banner + SEO">
        <form action={saveCollectionMerch} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <Input name="slug" placeholder="collection slug (vd. serum)" required />
          <Input name="title" placeholder="Tiêu đề hiển thị" />
          <Input name="banner_url" placeholder="Banner image URL" />
          <Input name="seo_title" placeholder="SEO title" />
          <Input name="seo_description" placeholder="SEO description" />
          <Button type="submit" variant="primary">
            Lưu merch
          </Button>
        </form>
      </Panel>
    </>
  );
}
