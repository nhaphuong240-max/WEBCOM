'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PttMark } from '@ptt/ui';
import { mainNav } from '@/lib/nav';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sections = Array.from(new Set(mainNav.map((i) => i.section)));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--ptt-sidebar-w) 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          background: 'var(--ptt-ink)',
          color: 'rgba(255,255,255,0.78)',
          padding: '20px 14px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{ color: '#fff', padding: '8px 10px 18px', fontSize: 18 }}>
          <PttMark label="PTT OS" />
        </div>
        {sections.map((section) => (
          <div key={section}>
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.35)',
                padding: '14px 12px 6px',
              }}
            >
              {section}
            </div>
            {mainNav
              .filter((i) => i.section === section)
              .map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const isRoot = item.href === '/';
                const on = isRoot ? pathname === '/' : active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      color: on ? '#fff' : 'rgba(255,255,255,0.72)',
                      background: on ? 'rgba(255,255,255,0.08)' : 'transparent',
                      boxShadow: on ? 'inset 3px 0 0 var(--ptt-accent)' : undefined,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
        <div style={{ marginTop: 24, padding: 12, fontSize: 11, opacity: 0.45 }}>
          Mockup parity · Command Center
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <header
          style={{
            height: 'var(--ptt-nav-h)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            background: 'var(--ptt-surface)',
            borderBottom: '1px solid var(--ptt-line)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ptt-ink-3)' }}>
            AURA Beauty ·{' '}
            <strong style={{ color: 'var(--ptt-ink)' }}>
              {pathname === '/' ? 'Command Center' : crumbLabel(pathname)}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                padding: '0 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                background: 'var(--ptt-signal-soft)',
                color: 'var(--ptt-signal)',
              }}
            >
              Live sync
            </span>
            <Link
              href="/website/analytics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 32,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid var(--ptt-line)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ptt-ink)',
                background: 'transparent',
              }}
            >
              Xuất báo cáo
            </Link>
            <Link
              href="/orders"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 32,
                padding: '0 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'var(--ptt-accent)',
              }}
            >
              Tạo đơn
            </Link>
          </div>
        </header>
        <main style={{ padding: 28 }}>{children}</main>
      </div>
    </div>
  );
}

function crumbLabel(pathname: string): string {
  if (pathname.startsWith('/website/analytics')) return 'Website · Analytics';
  if (pathname.startsWith('/website/golive')) return 'Website · Go-live';
  if (pathname.startsWith('/website/builder')) return 'CMS · Site Builder';
  if (pathname.startsWith('/website/templates')) return 'Template Store';
  if (pathname.startsWith('/website')) return 'Website · CMS';
  if (pathname.startsWith('/orders')) return 'Đơn hàng';
  if (pathname.startsWith('/customers')) return 'CRM';
  if (pathname.startsWith('/hr')) return 'HR';
  if (pathname.startsWith('/pos')) return 'POS';
  if (pathname.startsWith('/live')) return 'Live';
  if (pathname.startsWith('/revenue')) return 'Revenue';
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg) return 'Admin';
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}
