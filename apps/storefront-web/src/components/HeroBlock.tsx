'use client';

import Link from 'next/link';
import { useExperiment } from '../lib/experiment';

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
  const h = variant?.headline || headline;
  const c = variant?.cta || cta;
  const href = variant?.cta_href || ctaHref;

  return (
    <section
      style={{
        minHeight: '42vh',
        padding: '36px 20px',
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
          fontSize: 36,
          letterSpacing: '-0.04em',
          margin: '6px 0 10px',
          fontWeight: 800,
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
          width: 'fit-content',
        }}
      >
        {c}
      </Link>
    </section>
  );
}
