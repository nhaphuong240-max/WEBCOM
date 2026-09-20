import Link from 'next/link';
import { StoreShell } from '../../components/StoreShell';
import { getRuntime } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const runtime = await getRuntime();
  const accent =
    runtime.brand_kit?.colors?.accent ||
    runtime.brand_kit?.colors?.rose ||
    '#c45a6a';
  const cream =
    runtime.brand_kit?.colors?.cream ||
    runtime.brand_kit?.colors?.surface ||
    '#faf6f4';
  const ink = runtime.brand_kit?.colors?.ink || '#1a1214';
  const bottomLinks = Array.isArray(runtime.navigation?.bottom)
    ? (runtime.navigation.bottom as Array<{ label: string; href: string }>)
    : [];

  return (
    <StoreShell
      gtm={runtime.storefront.gtm_container_id}
      pixel={runtime.storefront.meta_pixel_id}
      accent={accent}
      cream={cream}
      ink={ink}
      bottomLinks={bottomLinks}
    >
      <section
        style={{
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(196,90,106,0.2), transparent), #1a1214',
          color: '#fff',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#e85d04',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: '#e85d04',
              borderRadius: 2,
            }}
          />
          Sắp phát
        </span>
        <h1
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 28,
            letterSpacing: '-0.03em',
            margin: '0 0 8px',
          }}
        >
          AURA Live
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.75, maxWidth: 280 }}>
          Flash deal serum &amp; set quà — theo dõi phiên live trên shop.
        </p>
        <Link
          href="/search"
          style={{
            height: 44,
            padding: '0 18px',
            display: 'inline-flex',
            alignItems: 'center',
            background: accent,
            color: '#fff',
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Xem sản phẩm
        </Link>
      </section>
    </StoreShell>
  );
}
