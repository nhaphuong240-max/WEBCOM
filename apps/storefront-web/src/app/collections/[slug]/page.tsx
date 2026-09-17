import Link from 'next/link';
import { StoreShell } from '../../../components/StoreShell';
import { formatVnd, getProducts, getRuntime } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [runtime, products] = await Promise.all([
    getRuntime(),
    getProducts({ collection: slug, sort: 'newest' }),
  ]);
  const title =
    ((runtime.theme.config as { collections?: Array<{ slug: string; title: string }> })?.collections || [])
      .find((c) => c.slug === slug)?.title || slug;

  return (
    <StoreShell>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>{title}</h1>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 14,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid rgba(26,18,20,0.06)',
              }}
            >
              <strong>{p.title}</strong>
              <div style={{ color: '#c45a6a', marginTop: 4 }}>{formatVnd(p.skus[0]?.unit_price)}</div>
            </Link>
          ))}
          {products.length === 0 ? (
            <p style={{ color: '#6b5559' }}>Chưa có SP khớp bộ lọc — thử Serum trên home.</p>
          ) : null}
        </div>
      </div>
    </StoreShell>
  );
}
