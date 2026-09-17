import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ink' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--ptt-accent)', color: '#fff', border: 'none' },
  ink: { background: 'var(--ptt-ink)', color: '#fff', border: 'none' },
  ghost: {
    background: 'transparent',
    color: 'var(--ptt-ink)',
    border: '1px solid var(--ptt-line-strong)',
  },
};

const sizeStyle: Record<Size, React.CSSProperties> = {
  sm: { height: 34, padding: '0 12px', fontSize: 13 },
  md: { height: 44, padding: '0 20px', fontSize: 14 },
  lg: { height: 52, padding: '0 28px', fontSize: 15 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 'var(--ptt-radius-sm)',
        fontWeight: 600,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.45 : 1,
        ...variantStyle[variant],
        ...sizeStyle[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
