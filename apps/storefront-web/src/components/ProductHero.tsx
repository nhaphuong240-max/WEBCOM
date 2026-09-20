import Link from 'next/link';

/** Mockup 08 — full-bleed product plane + CSS bottle (or photo). */
export function ProductHero({
  brandLabel = 'AURA',
  productLabel = 'Night Repair',
  photoUrl,
  showBottle = true,
  children,
}: {
  brandLabel?: string;
  productLabel?: string;
  photoUrl?: string | null;
  showBottle?: boolean;
  children?: React.ReactNode;
}) {
  const hasPhoto = Boolean(photoUrl);
  return (
    <section
      className={`aura-product-hero${hasPhoto ? ' has-photo' : ''}`}
      aria-label="Hình sản phẩm"
    >
      {hasPhoto ? (
        <div
          className="aura-product-photo"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
      ) : null}
      <div className="aura-product-plane" />
      {showBottle && !hasPhoto ? (
        <div className="aura-bottle" aria-hidden>
          <div className="aura-bottle-cap" />
          <div className="aura-bottle-neck" />
          <div className="aura-bottle-body">
            <div className="aura-bottle-label">
              {brandLabel}
              <small>{productLabel}</small>
            </div>
            <div className="aura-bottle-liquid" />
          </div>
        </div>
      ) : null}
      <div className="aura-gallery-dots" aria-hidden>
        <i className="on" />
        <i />
        <i />
      </div>
      {children}
    </section>
  );
}

export function CollectionStrip({
  items,
  activeHref,
}: {
  items: Array<{ label: string; href: string }>;
  activeHref?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      role="navigation"
      aria-label="Bộ sưu tập"
      style={{
        display: 'flex',
        gap: 8,
        padding: '14px 14px 4px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((c) => {
        const active = activeHref ? c.href === activeHref : false;
        return (
          <Link
            key={c.href + c.label}
            href={c.href}
            style={{
              flex: '0 0 auto',
              height: 34,
              padding: '0 14px',
              border: `1px solid ${active ? '#1a1214' : 'rgba(26,18,20,0.12)'}`,
              fontSize: 12,
              fontWeight: 500,
              color: active ? '#fff' : '#6b5559',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              background: active ? '#1a1214' : '#fff',
              textDecoration: 'none',
            }}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

export function TrustGrid({
  items = [
    { title: 'COD', sub: 'Toàn quốc' },
    { title: 'Đổi 7 ngày', sub: 'Miễn phí' },
    { title: 'Giao 2h', sub: 'Nội thành' },
  ],
}: {
  items?: Array<{ title: string; sub: string }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        background: 'rgba(26,18,20,0.08)',
        border: '1px solid rgba(26,18,20,0.08)',
        margin: '0 0 20px',
      }}
    >
      {items.map((t) => (
        <div key={t.title} style={{ background: '#fff', padding: '14px 10px', textAlign: 'center' }}>
          <strong style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
            {t.title}
          </strong>
          <span style={{ fontSize: 11, color: '#6b5559' }}>{t.sub}</span>
        </div>
      ))}
    </div>
  );
}
