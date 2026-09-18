'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../lib/cart';

const DEFAULT_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/account', label: 'Account' },
  { href: '/cart', label: 'Cart' },
];

export function BottomNav({
  links,
}: {
  links?: Array<{ label: string; href: string }>;
}) {
  const path = usePathname();
  const { qty } = useCart();
  const items = links && links.length > 0 ? links : DEFAULT_LINKS;
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)`,
        height: 56,
        background: 'rgba(250,246,244,0.96)',
        borderTop: '1px solid rgba(26,18,20,0.08)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {items.slice(0, 5).map((l) => {
        const active = path === l.href || (l.href !== '/' && path.startsWith(l.href));
        return (
          <Link
            key={l.href + l.label}
            href={l.href}
            style={{
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              color: active ? '#c45a6a' : '#6b5559',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            {l.label}
            {l.href === '/cart' && qty > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: '28%',
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
