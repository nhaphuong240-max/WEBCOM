import Link from 'next/link';

export default function CaseStudiesPage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <p>
        <Link href="/">← PTT</Link>
      </p>
      <h1 style={{ fontFamily: 'var(--ptt-font-display)', letterSpacing: '-0.03em' }}>
        Case studies & ROI
      </h1>
      <p style={{ opacity: 0.8, maxWidth: '42ch' }}>
        Merchant beauty tăng contribution margin +18% sau 90 ngày với WebCom go-live gate + funnel
        analytics (W5 corporate polish · FR-CORPWEB-005).
      </p>
      <article
        style={{
          marginTop: 28,
          padding: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>AURA Beauty VN</h2>
        <ul>
          <li>Time-to-first-order: 11 ngày</li>
          <li>Publish rollback &lt; 5 phút</li>
          <li>Page contribution hiển thị theo landing</li>
        </ul>
      </article>
    </main>
  );
}
