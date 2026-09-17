export function PttMark({ label = 'PTT' }: { label?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--ptt-font-display)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 12,
          height: 12,
          background: 'var(--ptt-accent)',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      />
      {label}
    </span>
  );
}
