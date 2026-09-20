import Link from 'next/link';

export default function CaseStudiesPage() {
  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Case / ROI</div>
        <h1>Case studies & ROI</h1>
        <p>
          Merchant beauty tăng contribution margin sau Go-live với WebCom — KPI before/after công
          khai.
        </p>
      </div>

      <article className="corp-card" style={{ maxWidth: 560 }}>
        <div className="meta">
          <span className="tag tag-accent">Beauty</span>
          <span className="tag">AURA</span>
        </div>
        <h3>AURA Beauty VN</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.7 }}>
          <li>CVR mobile: 1.8% → 2.3%</li>
          <li>LCP p75: 3.4s → 1.9s</li>
        </ul>
        <Link
          href="/case-studies/aura-beauty"
          className="corp-btn corp-btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          Xem case đầy đủ
        </Link>
      </article>
    </main>
  );
}
