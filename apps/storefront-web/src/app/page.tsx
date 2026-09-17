import { Badge, Button, PttMark } from '@ptt/ui';
import Link from 'next/link';

export default function StorefrontHome() {
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid var(--ptt-line)',
          background: 'rgba(250,248,246,0.92)',
          position: 'sticky',
          top: 0,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--ptt-ink-3)' }}>W0 shell</span>
        <strong style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 20 }}>AURA</strong>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ptt-ink-3)' }}>Giỏ (0)</span>
      </header>

      <section
        style={{
          minHeight: '58vh',
          padding: '40px 20px',
          color: '#fff',
          background:
            'radial-gradient(circle at 70% 30%, rgba(255,180,160,.55), transparent 45%), linear-gradient(165deg, #1a1514 0%, #3d2c28 40%, #c4a090 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 42, letterSpacing: '-0.04em' }}>
          AURA
        </div>
        <p style={{ opacity: 0.85, fontSize: 14, maxWidth: '28ch', margin: '8px 0 16px' }}>
          Storefront shell W0 — catalog & checkout sẽ có ở phase W2 (mockup 08).
        </p>
        <Button variant="primary">Sắp mở bán</Button>
      </section>

      <section style={{ padding: 20 }}>
        <Badge tone="accent">Schema-driven theme (W2)</Badge>
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ptt-ink-3)' }}>
          Runtime sẽ render BrandKit + ThemeVersion JSON qua Next.js SSR/ISR.
        </p>
        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--ptt-ink-3)' }}>
          <PttMark /> <span style={{ marginLeft: 8 }}>Powered by PTT Storefront</span>
        </div>
        <p style={{ marginTop: 12, fontSize: 12 }}>
          <Link href="http://localhost:3000" style={{ color: 'var(--ptt-accent)', fontWeight: 600 }}>
            ← Admin
          </Link>
        </p>
      </section>
    </div>
  );
}
