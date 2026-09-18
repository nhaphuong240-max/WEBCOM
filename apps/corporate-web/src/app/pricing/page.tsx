import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Pricing</div>
        <h1>Gói phù hợp từng giai đoạn</h1>
        <p>
          Trial miễn phí trước — nâng cấp khi cần analytics, SLA và headless. Theme one-time mua
          riêng trên marketplace.
        </p>
      </div>

      <div className="corp-price-grid">
        {[
          {
            name: 'Starter',
            price: 'Liên hệ',
            featured: false,
            items: ['1 storefront', 'Aura Lite / free themes', 'Go-live gate & rollback'],
          },
          {
            name: 'Growth',
            price: 'Liên hệ',
            featured: true,
            items: ['Analytics W4', 'Experiments', 'CRM / RFM / loyalty', 'Agency preview'],
          },
          {
            name: 'Platform',
            price: 'Liên hệ',
            featured: false,
            items: ['Headless API', 'SLA 99.9%', 'DR runbooks', 'Dedicated success'],
          },
        ].map((p) => (
          <div key={p.name} className={`corp-price-card${p.featured ? ' featured' : ''}`}>
            <h2>{p.name}</h2>
            <div className="price">{p.price}</div>
            <ul>
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <Link
              href="/#demo"
              className={`corp-btn ${p.featured ? 'corp-btn-primary' : 'corp-btn-ghost'}`}
              style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
            >
              Đặt demo
            </Link>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 36, color: 'var(--ink-3)', fontSize: 14 }}>
        Theme license (one_time) thanh toán VietQR riêng — xem{' '}
        <Link href="/templates" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Template Marketplace
        </Link>
        .
      </p>
    </main>
  );
}
