'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart';
import { BottomNav } from './BottomNav';
import { ConsentBanner } from './ConsentBanner';
import { TrackingPixels } from './TrackingPixels';

export function StoreShell({
  children,
  brand = 'AURA',
  gtm,
  pixel,
}: {
  children: React.ReactNode;
  brand?: string;
  gtm?: string | null;
  pixel?: string | null;
}) {
  const { qty } = useCart();
  return (
    <div
      className="aura-phone"
      style={{
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100dvh',
        background: '#faf6f4',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 0 0 1px rgba(11,20,32,0.06)',
      }}
    >
      <TrackingPixels gtmId={gtm} pixelId={pixel} />
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
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
            fontSize: 17,
            letterSpacing: '-0.04em',
            color: '#1a1214',
            textDecoration: 'none',
          }}
        >
          {brand} <span style={{ color: '#c45a6a' }}>Beauty</span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/search" style={{ fontSize: 13, color: '#6b5559', textDecoration: 'none' }}>
            Tìm
          </Link>
          <Link
            href="/cart"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1a1214',
              textDecoration: 'none',
            }}
          >
            Giỏ ({qty})
          </Link>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      <BottomNav />
      <ConsentBanner hasGtm={!!gtm} hasPixel={!!pixel} />
    </div>
  );
}
