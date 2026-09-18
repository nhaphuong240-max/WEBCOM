import Link from 'next/link';

const ITEMS = [
  { title: 'Runbook: Publish fail', href: '/docs/runbooks/publish-fail.md', meta: 'Ops' },
  { title: 'Playbook go-live checklist', href: '/#solutions', meta: 'Go-live' },
  { title: 'Headless API OpenAPI', href: '/resources', meta: 'API' },
  { title: 'Performance budget & k6', href: '/resources', meta: 'Perf' },
];

export default function ResourcesPage() {
  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Resources</div>
        <h1>Tài nguyên vận hành</h1>
        <p>Runbook, playbook và API — để team go-live an toàn và đo được margin.</p>
      </div>

      <div className="corp-card-grid">
        {ITEMS.map((item) => (
          <a key={item.title} href={item.href} className="corp-card">
            <div className="meta">
              <span className="tag">{item.meta}</span>
            </div>
            <h3>{item.title}</h3>
            <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>Mở →</span>
          </a>
        ))}
      </div>

      <p style={{ marginTop: 32 }}>
        <Link href="/#demo" className="corp-btn corp-btn-primary">
          Book demo
        </Link>
      </p>
    </main>
  );
}
