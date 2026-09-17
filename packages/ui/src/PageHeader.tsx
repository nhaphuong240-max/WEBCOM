import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{title}</h1>
        {description ? (
          <p style={{ color: 'var(--ptt-ink-3)', marginTop: 6, fontSize: 14, maxWidth: 560 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
