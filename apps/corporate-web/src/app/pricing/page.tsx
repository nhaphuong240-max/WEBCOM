import Link from 'next/link';

export default function PricingPage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <p>
        <Link href="/">← PTT</Link>
      </p>
      <h1 style={{ fontFamily: 'var(--ptt-font-display)', letterSpacing: '-0.03em' }}>Pricing</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        {[
          { name: 'Starter', price: 'Liên hệ', items: ['1 storefront', 'Aura Lite', 'Go-live gate'] },
          { name: 'Growth', price: 'Liên hệ', items: ['Analytics W4', 'Experiments', 'Agency preview'] },
          { name: 'Platform', price: 'Liên hệ', items: ['Headless API', 'SLA 99.9%', 'DR runbooks'] },
        ].map((p) => (
          <div
            key={p.name}
            style={{
              padding: 18,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>{p.name}</h2>
            <p style={{ fontWeight: 700 }}>{p.price}</p>
            <ul>
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link href="/">Đặt demo →</Link>
      </p>
    </main>
  );
}
