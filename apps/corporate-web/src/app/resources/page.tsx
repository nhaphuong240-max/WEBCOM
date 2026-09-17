import Link from 'next/link';

export default function ResourcesPage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <p>
        <Link href="/">← PTT</Link>
      </p>
      <h1 style={{ fontFamily: 'var(--ptt-font-display)', letterSpacing: '-0.03em' }}>Resources</h1>
      <ul style={{ lineHeight: 1.9 }}>
        <li>
          <a href="/docs/runbooks/publish-fail.md">Runbook: Publish fail</a>
        </li>
        <li>Playbook go-live checklist (mockup 07)</li>
        <li>Headless API OpenAPI W5</li>
        <li>Performance budget & k6 scenarios</li>
      </ul>
    </main>
  );
}
