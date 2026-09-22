'use client';

export function FloatingContacts({
  channels,
}: {
  channels: Array<{ key: string; label: string; href: string; color1?: string }>;
}) {
  if (!channels.length) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 72,
        zIndex: 50,
        display: 'grid',
        gap: 8,
      }}
    >
      {channels.map((c) => (
        <a
          key={c.key}
          href={c.href}
          title={c.label}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: 999,
            background: c.color1 || '#1E5AA8',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          }}
        >
          {c.key === 'hotline' ? 'Gọi' : c.key === 'zalo' ? 'Zalo' : c.label.slice(0, 4)}
        </a>
      ))}
    </div>
  );
}
