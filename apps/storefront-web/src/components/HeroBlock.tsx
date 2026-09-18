'use client';

import Link from 'next/link';
import { useExperiment } from '../lib/experiment';
import { useThemePreview } from './ThemePreviewChrome';

export function HeroBlock({
  eyebrow,
  headline,
  cta,
  ctaHref,
  accent,
}: {
  eyebrow: string;
  headline: string;
  cta: string;
  ctaHref: string;
  accent: string;
}) {
  const { variant } = useExperiment('hero_cta_v1');
  const preview = useThemePreview();
  const desktop = preview.active && preview.mode === 'desktop';
  const h = variant?.headline || headline;
  const c = variant?.cta || cta;
  const href = variant?.cta_href || ctaHref;

  return (
    <section
      style={{
        minHeight: desktop ? 'min(72vh, 640px)' : '42vh',
        padding: desktop ? '56px clamp(20px, 4vw, 48px)' : '36px 20px',
        color: '#fff',
        background:
          'radial-gradient(circle at 70% 30%, rgba(255,180,160,.55), transparent 45%), linear-gradient(165deg, #1a1514 0%, #3d2c28 40%, #c4a090 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: '0.04em' }}>{eyebrow}</div>
      <h1
        style={{
          fontFamily: 'var(--ptt-font-display)',
          fontSize: desktop ? 'clamp(36px, 5vw, 56px)' : 36,
          letterSpacing: '-0.04em',
          margin: '6px 0 10px',
          fontWeight: 800,
          maxWidth: desktop ? '16ch' : undefined,
        }}
      >
        {h}
      </h1>
      <Link
        href={href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 44,
          padding: '0 18px',
          background: accent,
          color: '#fff',
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        {c}
      </Link>
    </section>
  );
}
