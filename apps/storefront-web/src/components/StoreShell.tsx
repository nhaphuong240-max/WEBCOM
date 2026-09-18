'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart';
import { BottomNav } from './BottomNav';
import { ConsentBanner } from './ConsentBanner';
import { TrackingPixels } from './TrackingPixels';
import { PageViewTracker } from './PageViewTracker';
import { useThemePreview } from './ThemePreviewChrome';

export function StoreShell({
  children,
  brand = 'AURA',
  gtm,
  pixel,
  accent = '#c45a6a',
  cream = '#faf6f4',
  ink = '#1a1214',
}: {
  children: React.ReactNode;
  brand?: string;
  gtm?: string | null;
  pixel?: string | null;
  accent?: string;
  cream?: string;
  ink?: string;
}) {
  const { qty } = useCart();
  const preview = useThemePreview();
  const desktop = preview.active && preview.mode === 'desktop';
  const mobilePreview = preview.active && preview.mode === 'mobile';

  return (
    <div
      className="aura-phone"
      style={
        {
          maxWidth: desktop ? '100%' : mobilePreview ? '100%' : 430,
          margin: desktop || mobilePreview ? 0 : '0 auto',
          minHeight: preview.active ? '100%' : '100dvh',
          background: cream,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: preview.active ? 'none' : '0 0 0 1px rgba(11,20,32,0.06)',
          ['--brand-accent' as string]: accent,
          ['--brand-cream' as string]: cream,
          ['--brand-ink' as string]: ink,
        } as React.CSSProperties
      }
    >
      <PageViewTracker />
      <TrackingPixels gtmId={gtm} pixelId={pixel} />
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: desktop ? 64 : 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: desktop ? '0 clamp(20px, 4vw, 48px)' : '0 14px',
          background: 'rgba(250,246,244,0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(26,18,20,0.06)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontWeight: 800,
            fontSize: desktop ? 20 : 17,
            letterSpacing: '-0.04em',
            color: ink,
            textDecoration: 'none',
          }}
        >
          {brand} <span style={{ color: accent }}>Beauty</span>
        </Link>
        {desktop ? (
          <nav
            style={{
              display: 'flex',
              gap: 22,
              fontSize: 14,
              fontWeight: 500,
              color: '#6b5559',
            }}
          >
            <Link href="/collections/serum" style={{ color: 'inherit', textDecoration: 'none' }}>
              Serum
            </Link>
            <Link href="/collections/skincare" style={{ color: 'inherit', textDecoration: 'none' }}>
              Skincare
            </Link>
            <Link href="/search" style={{ color: 'inherit', textDecoration: 'none' }}>
              Tìm kiếm
            </Link>
          </nav>
        ) : null}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/search" style={{ fontSize: 13, color: '#6b5559', textDecoration: 'none' }}>
            {desktop ? 'Tài khoản' : 'Tìm'}
          </Link>
          <Link
            href="/cart"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: ink,
              textDecoration: 'none',
            }}
          >
            Giỏ ({qty})
          </Link>
        </div>
      </header>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          ...(desktop
            ? {
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
              }
            : null),
        }}
      >
        {children}
      </div>
      {!desktop ? <BottomNav /> : null}
      <ConsentBanner hasGtm={!!gtm} hasPixel={!!pixel} />
    </div>
  );
}
