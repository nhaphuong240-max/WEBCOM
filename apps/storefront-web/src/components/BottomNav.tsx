'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../lib/cart';

const DEFAULT_LINKS = [
  { href: '/', label: 'Home', icon: 'home' as const },
  { href: '/search', label: 'Search', icon: 'search' as const },
  { href: '/live', label: 'Live', icon: 'live' as const },
  { href: '/account', label: 'Account', icon: 'account' as const },
  { href: '/cart', label: 'Cart', icon: 'cart' as const },
];

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#c45a6a' : 'currentColor';
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    'aria-hidden': true as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case 'live':
      return (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <svg {...common}>
            <circle cx="12" cy="12" r="3" fill={active ? '#c45a6a' : 'none'} />
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="10" opacity={0.35} />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: -1,
              right: -3,
              width: 6,
              height: 6,
              background: '#e85d04',
              borderRadius: 1,
            }}
          />
        </span>
      );
    case 'account':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      );
    case 'cart':
      return (
        <svg {...common}>
          <path d="M6 7h12l-1 12H7L6 7z" />
          <path d="M9 7V5a3 3 0 016 0v2" />
        </svg>
      );
    default:
      return <span style={{ width: 20, height: 20 }} />;
  }
}

function iconFor(href: string, label: string): string {
  const h = href.toLowerCase();
  const l = label.toLowerCase();
  if (h === '/' || l.includes('home') || l.includes('trang')) return 'home';
  if (h.includes('search') || l.includes('tìm')) return 'search';
  if (h.includes('live') || l.includes('live')) return 'live';
  if (h.includes('account') || l.includes('tài')) return 'account';
  if (h.includes('cart') || l.includes('giỏ')) return 'cart';
  return 'home';
}

export function BottomNav({
  links,
}: {
  links?: Array<{ label: string; href: string }>;
}) {
  const path = usePathname();
  const { qty } = useCart();
  let items =
    links && links.length > 0
      ? links.slice(0, 5).map((l) => ({ ...l, icon: iconFor(l.href, l.label) }))
      : DEFAULT_LINKS;

  // Ensure Live is present (mockup 08 center tab) when CMS nav omits it.
  if (!items.some((l) => l.href === '/live' || /live/i.test(l.label))) {
    const insertAt = Math.min(2, items.length);
    items = [
      ...items.slice(0, insertAt),
      { href: '/live', label: 'Live', icon: 'live' as const },
      ...items.slice(insertAt),
    ].slice(0, 5);
  }

  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)`,
        height: 56,
        background: '#fff',
        borderTop: '1px solid rgba(26,18,20,0.08)',
      }}
    >
      {items.map((l) => {
        const active = path === l.href || (l.href !== '/' && path.startsWith(l.href));
        return (
          <Link
            key={l.href + l.label}
            href={l.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              fontSize: 10,
              fontWeight: active ? 600 : 500,
              color: active ? '#1a1214' : '#6b5559',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            <NavIcon name={l.icon} active={active} />
            {l.label}
            {l.href === '/cart' && qty > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: '22%',
                  background: '#c45a6a',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 10,
                  minWidth: 16,
                  height: 16,
                  display: 'grid',
                  placeItems: 'center',
                  padding: '0 3px',
                }}
              >
                {qty}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
