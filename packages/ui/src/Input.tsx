import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        height: 40,
        padding: '0 12px',
        border: '1px solid var(--ptt-line)',
        borderRadius: 'var(--ptt-radius-sm)',
        background: 'var(--ptt-surface)',
        color: 'var(--ptt-ink)',
        width: '100%',
        ...props.style,
      }}
    />
  );
}
