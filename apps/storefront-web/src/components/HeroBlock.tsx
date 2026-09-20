'use client';

import Link from 'next/link';
import { useExperiment } from '../lib/experiment';
import { useThemePreview } from './ThemePreviewChrome';
import { ProductHero } from './ProductHero';

export function HeroBlock({
  eyebrow,
  headline,
  cta,
  ctaHref,
  accent,
  experimentCode,
}: {
  eyebrow: string;
  headline: string;
  cta: string;
  ctaHref: string;
  accent: string;
  experimentCode?: string | null;
}) {
  const code = experimentCode?.trim() || 'hero_cta_v1';
  const { variant } = useExperiment(code);
  const preview = useThemePreview();
  const desktop = preview.active && preview.mode === 'desktop';
  const h = variant?.headline || headline;
  const c = variant?.cta || cta;
  const href = variant?.cta_href || ctaHref;

  return (
    <ProductHero brandLabel={eyebrow.split(' ')[0] || 'AURA'} productLabel="Night Repair">
      <div
        className="aura-hero-copy"
        style={{
          padding: desktop ? '64px clamp(20px, 4vw, 48px) 36px' : undefined,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: '0.04em' }}>{eyebrow}</div>
        <h1
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: desktop ? 'clamp(36px, 5vw, 52px)' : 28,
            letterSpacing: '-0.04em',
            margin: '6px 0 12px',
            fontWeight: 800,
            maxWidth: desktop ? '16ch' : '18ch',
            lineHeight: 1.15,
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
          }}
        >
          {c}
        </Link>
      </div>
    </ProductHero>
  );
}
