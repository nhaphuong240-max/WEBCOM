'use client';

import Link from 'next/link';
import { useCart } from '../lib/cart';
import { BottomNav } from './BottomNav';
import { ConsentBanner } from './ConsentBanner';
import { TrackingPixels } from './TrackingPixels';
import { PageViewTracker } from './PageViewTracker';
import { useThemePreview } from './ThemePreviewChrome';
import { FloatingContacts } from './FloatingContacts';
import { MiniCart, openMiniCart } from './MiniCart';
import { MegaNav } from './MegaNav';
import type { NavLink } from '../lib/nav';

export function StoreShell({
  children,
  brand = 'AURA',
  gtm,
  pixel,
  accent = '#c45a6a',
  cream = '#faf6f4',
  ink = '#1a1214',
  headerLinks,
  bottomLinks,
  showCart = true,
  showCartCount = true,
  showMiniCart = false,
  miniCart,
  headerCta,
  announcement,
  floating,
  headerBg,
  headerFg,
}: {
  children: React.ReactNode;
  brand?: string;
  gtm?: string | null;
  pixel?: string | null;
  accent?: string;
  cream?: string;
  ink?: string;
  headerLinks?: NavLink[];
  bottomLinks?: Array<{ label: string; href: string }>;
  showCart?: boolean;
  showCartCount?: boolean;
  showMiniCart?: boolean;
  miniCart?: { title?: string; checkout_label?: string; continue_label?: string } | null;
  headerCta?: { label: string; href: string } | null;
  announcement?: { text: string; href: string } | null;
  floating?: Array<{ key: string; label: string; href: string; color1?: string }>;
  headerBg?: string;
  headerFg?: string;
}) {
  const { qty } = useCart();
  const preview = useThemePreview();
  const desktop = preview.active && preview.mode === 'desktop';
  const mobilePreview = preview.active && preview.mode === 'mobile';
  const navLinks: NavLink[] =
    headerLinks && headerLinks.length > 0
      ? headerLinks
      : [
          { label: 'Serum', href: '/collections/serum' },
          { label: 'Skincare', href: '/collections/skincare' },
          { label: 'Tìm kiếm', href: '/search' },
        ];

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
      {announcement ? (
        <div
          style={{
            background: accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            padding: '8px 12px',
          }}
        >
          <Link href={announcement.href || '/'} style={{ color: 'inherit', textDecoration: 'none' }}>
            {announcement.text}
          </Link>
        </div>
      ) : null}
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
          background: headerBg || 'rgba(250,246,244,0.92)',
          color: headerFg || ink,
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
            color: headerFg || ink,
            textDecoration: 'none',
          }}
        >
          {brand}
        </Link>
        <div
          className="ptt-header-mega-wrap"
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            height: '100%',
            alignItems: 'center',
          }}
        >
          <MegaNav items={navLinks} accent={accent} ink={ink} />
        </div>
        <style>{`
          @media (max-width: 899px) {
            .ptt-header-mega-wrap { display: none !important; }
          }
        `}</style>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {headerCta?.label ? (
            <Link
              href={headerCta.href || '/'}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                background: accent,
                padding: '6px 10px',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              {headerCta.label}
            </Link>
          ) : null}
          <Link href="/search" style={{ fontSize: 13, color: '#6b5559', textDecoration: 'none' }}>
            {desktop ? 'Tài khoản' : 'Tìm'}
          </Link>
          {showCart ? (
            showMiniCart ? (
              <button
                type="button"
                onClick={() => openMiniCart()}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: ink,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Giỏ{showCartCount && qty > 0 ? ` (${qty})` : ''}
              </button>
            ) : (
              <Link
                href="/cart"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: ink,
                  textDecoration: 'none',
                }}
              >
                Giỏ{showCartCount && qty > 0 ? ` (${qty})` : ''}
              </Link>
            )
          ) : null}
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <BottomNav links={bottomLinks} />
      <ConsentBanner />
      <FloatingContacts channels={floating || []} />
      <MiniCart
        enabled={showCart && showMiniCart}
        title={miniCart?.title}
        checkoutLabel={miniCart?.checkout_label}
        continueLabel={miniCart?.continue_label}
        accent={accent}
      />
    </div>
  );
}
