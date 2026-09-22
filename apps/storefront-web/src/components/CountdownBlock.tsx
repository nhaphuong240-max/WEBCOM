'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/** Parse campaign end time; bare datetime treated as Asia/Ho_Chi_Minh (+07). */
export function parseCampaignEnd(endsAt: string): number {
  const raw = endsAt.trim();
  if (!raw) return NaN;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return Date.parse(raw);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return Date.parse(`${normalized}+07:00`);
}

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export function CountdownBlock({
  title,
  label = 'Kết thúc sau',
  endsAt,
  href,
  hideWhenEnded = true,
  accent = '#c45a6a',
}: {
  title?: string;
  label?: string;
  endsAt: string;
  href?: string;
  hideWhenEnded?: boolean;
  accent?: string;
}) {
  const endMs = useMemo(() => parseCampaignEnd(endsAt), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(endMs)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endMs]);

  if (!Number.isFinite(endMs)) return null;

  const left = endMs - now;
  const ended = left <= 0;

  if (ended && hideWhenEnded) return null;

  const total = Math.max(0, Math.floor(left / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const body = (
    <div
      style={{
        margin: '8px clamp(14px, 3vw, 48px)',
        padding: '16px 14px',
        borderRadius: 12,
        border: `1px solid ${accent}44`,
        background: ended ? 'rgba(26,18,20,0.04)' : '#fff',
      }}
    >
      {title ? (
        <div
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ fontSize: 13, color: '#6b5559', marginBottom: 10 }}>
        {ended ? 'Chiến dịch đã kết thúc' : label}
        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>· Asia/Ho_Chi_Minh</span>
      </div>
      {!ended ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            fontSize: 22,
            color: accent,
            fontFamily: 'var(--ptt-font-display)',
          }}
        >
          {days > 0 ? <Unit value={pad(days)} label="ngày" /> : null}
          <Unit value={pad(hours)} label="giờ" />
          <Unit value={pad(mins)} label="phút" />
          <Unit value={pad(secs)} label="giây" />
        </div>
      ) : null}
    </div>
  );

  if (href && !ended) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {body}
      </Link>
    );
  }
  return body;
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 48 }}>
      <div>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#6b5559', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}
