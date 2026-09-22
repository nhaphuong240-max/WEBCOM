'use client';

import Link from 'next/link';
import { useState } from 'react';
import { parseCampaignEnd } from './CountdownBlock';

export function CouponStrip({
  code,
  title = 'Mã giảm giá',
  hint,
  ctaLabel = 'Áp dụng khi checkout',
  ctaHref = '/checkout',
  endsAt,
  accent = '#c45a6a',
}: {
  code: string;
  title?: string;
  hint?: string;
  ctaLabel?: string;
  ctaHref?: string;
  endsAt?: string | null;
  accent?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!code.trim()) return null;
  if (endsAt) {
    const end = parseCampaignEnd(endsAt);
    if (Number.isFinite(end) && end < Date.now()) return null;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      style={{
        margin: '10px clamp(14px, 3vw, 48px)',
        padding: '14px 16px',
        borderRadius: 12,
        border: `1.5px dashed ${accent}`,
        background: `${accent}12`,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <code
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: accent,
            background: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
          }}
        >
          {code}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid rgba(26,18,20,0.12)',
            background: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {copied ? 'Đã copy' : 'Copy'}
        </button>
        <Link
          href={ctaHref}
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            background: accent,
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          {ctaLabel}
        </Link>
      </div>
      {hint ? <p style={{ margin: 0, fontSize: 12, color: '#6b5559' }}>{hint}</p> : null}
    </section>
  );
}
