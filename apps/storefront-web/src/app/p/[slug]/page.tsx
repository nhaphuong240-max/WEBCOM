import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoreShell } from '../../../components/StoreShell';
import { getPage, getRuntime } from '../../../lib/api';

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
  const content = page.content as {
    hero?: Record<string, string>;
    body?: string;
    trust?: string[];
  };
  const accent = runtime.brand_kit?.colors?.accent || '#c45a6a';

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={runtime.brand_kit?.colors?.cream || '#faf6f4'}
      ink={runtime.brand_kit?.colors?.ink || '#1a1214'}
    >
      <section style={{ padding: 24 }}>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{content.hero?.eyebrow || page.title}</p>
        <h1
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 28,
            letterSpacing: '-0.03em',
            margin: '8px 0 16px',
          }}
        >
          {content.hero?.headline || page.title}
        </h1>
        {content.body ? <p style={{ lineHeight: 1.6 }}>{content.body}</p> : null}
        {content.hero?.cta ? (
          <Link
            href={content.hero.cta_href || '/'}
            style={{
              display: 'inline-flex',
              height: 44,
              alignItems: 'center',
              padding: '0 16px',
              background: accent,
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              textDecoration: 'none',
              marginTop: 12,
            }}
          >
            {content.hero.cta}
          </Link>
        ) : null}
      </section>
    </StoreShell>
  );
}
