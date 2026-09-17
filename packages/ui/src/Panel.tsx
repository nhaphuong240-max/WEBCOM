import type { ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: 'var(--ptt-surface)',
        border: '1px solid var(--ptt-line)',
        borderRadius: 'var(--ptt-radius)',
        boxShadow: '0 1px 0 rgba(11, 20, 32, 0.04)',
      }}
    >
      {(title || action) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--ptt-line)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <span>{title}</span>
          {action}
        </header>
      )}
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}
