'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { NavLink } from '../lib/nav';
import { hasMega } from '../lib/nav';

export function MegaNav({
  items,
  accent = '#c45a6a',
  ink = '#1a1214',
}: {
  items: NavLink[];
  accent?: string;
  ink?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenKey(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenKey(null);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <nav
      ref={rootRef}
      className="ptt-mega-nav"
      style={{
        display: 'flex',
        gap: 4,
        fontSize: 14,
        fontWeight: 500,
        color: '#6b5559',
        position: 'relative',
        alignItems: 'stretch',
        height: '100%',
      }}
    >
      {items.map((l) => {
        const key = `${l.label}|${l.href}`;
        const mega = hasMega(l);
        const open = openKey === key;
        return (
          <div
            key={key}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => mega && setOpenKey(key)}
            onMouseLeave={() => mega && setOpenKey(null)}
          >
            {mega ? (
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : key)}
                style={{
                  background: open ? `${accent}14` : 'transparent',
                  border: 'none',
                  color: open ? ink : 'inherit',
                  font: 'inherit',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: 8,
                }}
              >
                {l.label}
                <span style={{ marginLeft: 4, opacity: 0.55, fontSize: 10 }}>▾</span>
              </button>
            ) : (
              <Link
                href={l.href}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                {l.label}
              </Link>
            )}

            {mega && open && l.mega ? (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: 520,
                  maxWidth: 'min(860px, 92vw)',
                  background: '#fff',
                  border: '1px solid rgba(26,18,20,0.08)',
                  borderRadius: 14,
                  boxShadow: '0 16px 40px rgba(26,18,20,0.12)',
                  padding: 16,
                  zIndex: 60,
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns:
                    (l.mega.featured_products?.length || 0) > 0 ? '1.2fr 1fr' : '1fr',
                }}
              >
                <div style={{ display: 'grid', gap: 14 }}>
                  {l.mega.columns?.length ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(l.mega.columns.length, 3)}, minmax(120px, 1fr))`,
                        gap: 14,
                      }}
                    >
                      {l.mega.columns.map((col) => (
                        <div key={col.title}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: '#6b5559',
                              marginBottom: 8,
                            }}
                          >
                            {col.title}
                          </div>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {col.links.map((link) => (
                              <li key={link.href + link.label} style={{ marginBottom: 6 }}>
                                <Link
                                  href={link.href}
                                  onClick={() => setOpenKey(null)}
                                  style={{
                                    color: ink,
                                    textDecoration: 'none',
                                    fontSize: 13,
                                    fontWeight: 500,
                                  }}
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {l.mega.featured_collections?.length ? (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#6b5559',
                          marginBottom: 8,
                        }}
                      >
                        Bộ sưu tập
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {l.mega.featured_collections.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/collections/${c.slug}`}
                            onClick={() => setOpenKey(null)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: `${accent}14`,
                              color: accent,
                              textDecoration: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {c.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Link
                    href={l.href}
                    onClick={() => setOpenKey(null)}
                    style={{ fontSize: 12, color: accent, fontWeight: 700, textDecoration: 'none' }}
                  >
                    Xem tất cả →
                  </Link>
                </div>

                {l.mega.featured_products?.length ? (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#6b5559',
                        marginBottom: 8,
                      }}
                    >
                      Nổi bật
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {l.mega.featured_products.slice(0, 4).map((p) => (
                        <Link
                          key={p.slug}
                          href={`/products/${p.slug}`}
                          onClick={() => setOpenKey(null)}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: ink,
                            padding: 8,
                            borderRadius: 10,
                            background: 'rgba(26,18,20,0.03)',
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              flex: '0 0 auto',
                              background: p.image
                                ? `url(${p.image}) center/cover`
                                : `linear-gradient(145deg,#2a1c1e,${accent})`,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <style>{`
        @media (max-width: 899px) {
          .ptt-mega-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
