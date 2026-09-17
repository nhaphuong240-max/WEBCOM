import type { ReactNode } from 'react';

export function Kpi({
  label,
  value,
  delta,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        background: emphasis ? 'var(--ptt-ink)' : 'var(--ptt-surface)',
        color: emphasis ? '#fff' : 'var(--ptt-ink)',
        border: `1px solid ${emphasis ? 'var(--ptt-ink)' : 'var(--ptt-line)'}`,
        borderRadius: 'var(--ptt-radius)',
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: emphasis ? 'rgba(255,255,255,0.55)' : 'var(--ptt-ink-3)',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--ptt-font-display)',
          fontSize: 28,
          letterSpacing: '-0.03em',
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {delta ? (
        <div style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>{delta}</div>
      ) : null}
    </div>
  );
}
