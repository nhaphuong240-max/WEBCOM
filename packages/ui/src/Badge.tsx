import type { ReactNode } from 'react';

type Tone = 'signal' | 'accent' | 'warn' | 'danger' | 'muted';

const tones: Record<Tone, React.CSSProperties> = {
  signal: { background: 'var(--ptt-signal-soft)', color: 'var(--ptt-signal)' },
  accent: { background: 'var(--ptt-accent-soft)', color: 'var(--ptt-accent-2)' },
  warn: { background: 'rgba(201, 133, 0, 0.12)', color: '#8a5d00' },
  danger: { background: 'rgba(209, 67, 67, 0.12)', color: 'var(--ptt-danger)' },
  muted: { background: 'var(--ptt-paper-2)', color: 'var(--ptt-ink-3)' },
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
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
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}
