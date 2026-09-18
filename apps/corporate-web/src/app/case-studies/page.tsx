import Link from 'next/link';

export default function CaseStudiesPage() {
  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Case / ROI</div>
        <h1>Case studies & ROI</h1>
        <p>
          Merchant beauty tăng contribution margin +18% sau 90 ngày với WebCom go-live gate + funnel
          analytics.
        </p>
      </div>

      <article className="corp-card" style={{ maxWidth: 560 }}>
        <div className="meta">
          <span className="tag tag-accent">Beauty</span>
          <span className="tag">90 ngày</span>
        </div>
        <h3>AURA Beauty VN</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.7 }}>
          <li>Time-to-first-order: 11 ngày</li>
          <li>Publish rollback &lt; 5 phút</li>
          <li>Page contribution hiển thị theo landing</li>
        </ul>
        <Link href="/#demo" className="corp-btn corp-btn-primary" style={{ alignSelf: 'flex-start' }}>
          Đặt demo tương tự
        </Link>
      </article>
    </main>
  );
}
