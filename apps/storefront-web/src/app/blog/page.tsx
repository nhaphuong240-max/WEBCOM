import Link from 'next/link';
import { StoreShell } from '../../components/StoreShell';
import { getBlogPosts, getRuntime } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  const [runtime, posts] = await Promise.all([getRuntime(), getBlogPosts().catch(() => [])]);
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
      <section style={{ padding: '24px clamp(14px, 3vw, 48px)' }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 28, margin: '0 0 8px' }}>
          Blog
        </h1>
        <p style={{ color: '#6b5559', marginTop: 0 }}>CMS-3 · bài viết đã publish</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 12 }}>
          {posts.length === 0 ? (
            <li style={{ opacity: 0.7, fontSize: 14 }}>Chưa có bài blog published.</li>
          ) : (
            posts.map((p) => (
              <li
                key={p.slug}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid rgba(26,18,20,0.08)',
                  padding: 16,
                }}
              >
                <Link
                  href={`/blog/${p.slug}`}
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: 17,
                    fontFamily: 'var(--ptt-font-display)',
                  }}
                >
                  {p.title}
                </Link>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>/blog/{p.slug}</div>
              </li>
            ))
          )}
        </ul>
      </section>
    </StoreShell>
  );
}
