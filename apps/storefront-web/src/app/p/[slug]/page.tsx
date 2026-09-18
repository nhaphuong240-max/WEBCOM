import { notFound } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { SectionStack } from '../../../components/sections/SectionStack';
import { getPage, getRuntime } from '../../../lib/api';
import { normalizeContent } from '../../../lib/normalize-content';

export const dynamic = 'force-dynamic';

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (['products', 'collections', 'cart', 'checkout', 'account', 'search', 'order'].includes(slug)) {
    notFound();
  }
  let page;
  let runtime;
  try {
    [page, runtime] = await Promise.all([getPage(slug), getRuntime()]);
  } catch {
    notFound();
  }
  const content = normalizeContent((page.content as Record<string, unknown>) || {});
  const accent = runtime.brand_kit?.colors?.accent || '#c45a6a';
  const headerLinks = Array.isArray(runtime.navigation?.header)
    ? (runtime.navigation.header as Array<{ label: string; href: string }>)
    : [];
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={runtime.brand_kit?.colors?.cream || '#faf6f4'}
      ink={runtime.brand_kit?.colors?.ink || '#1a1214'}
      headerLinks={headerLinks}
      bottomLinks={bottomLinks}
    >
      {content.section_order.length ? (
        <SectionStack content={content} accent={accent} />
      ) : (
        <section style={{ padding: 24 }}>
          <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28 }}>{page.title}</h1>
        </section>
      )}
    </StoreShell>
  );
}
