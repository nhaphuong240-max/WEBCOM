import Link from 'next/link';
import { Badge, Button, Panel } from '@ptt/ui';

export const dynamic = 'force-dynamic';

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') ||
  process.env.INTERNAL_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3001';

const DEMO =
  process.env.NEXT_PUBLIC_DEMO_URL?.replace(/\/$/, '') || 'https://themes.ngoinhahomnay.vn';
const CONSOLE =
  process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ||
  'https://webecom.ngoinhahomnay.vn/console';

type Template = {
  id: string;
  code: string;
  name: string;
  industry: string;
  goal: string;
  license: string;
  scores?: { cvr?: number; mobile?: number; seo?: number };
};

async function loadTemplates(): Promise<Template[]> {
  try {
    const res = await fetch(`${API}/api/v1/public/templates?sort=cvr`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Template[];
  } catch {
    return [];
  }
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ industry?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  let templates = await loadTemplates();
  if (sp.industry) {
    templates = templates.filter((t) => t.industry === sp.industry);
  }
  const industries = Array.from(new Set((await loadTemplates()).map((t) => t.industry))).sort();

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/" style={{ color: '#7dd3fc', fontSize: 14 }}>
          ← PTT
        </Link>
        <h1
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            letterSpacing: '-0.03em',
            margin: '12px 0 8px',
          }}
        >
          Template Marketplace
        </h1>
        <p style={{ opacity: 0.75, maxWidth: '52ch', margin: 0 }}>
          Chọn template → xem demo live → dùng thử miễn phí → mua theme khi sẵn sàng.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, fontSize: 13 }}>
        <Link href="/templates" style={{ color: '#7dd3fc' }}>
          All
        </Link>
        {industries.map((i) => (
          <Link key={i} href={`/templates?industry=${encodeURIComponent(i)}`} style={{ color: '#7dd3fc' }}>
            {i}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {templates.map((t) => {
          const demoHref = `${DEMO}/?demo=${encodeURIComponent(t.code)}`;
          const trialHref = `${CONSOLE}/website/onboarding`;
          const buyHref = `${CONSOLE}/website/templates?focus=${encodeURIComponent(t.code)}`;
          return (
            <Panel key={t.id} title={t.name}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Badge tone="muted">{t.industry}</Badge>
                <Badge tone="accent">{t.goal}</Badge>
                <Badge tone="signal">{t.license}</Badge>
              </div>
              <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
                CVR {t.scores?.cvr ?? '—'} · Mobile {t.scores?.mobile ?? '—'} · SEO{' '}
                {t.scores?.seo ?? '—'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={demoHref} target="_blank" rel="noreferrer">
                  <Button type="button" variant="ghost" style={{ width: '100%' }}>
                    Xem demo
                  </Button>
                </a>
                <a href={trialHref}>
                  <Button type="button" variant="primary" style={{ width: '100%' }}>
                    Dùng thử miễn phí
                  </Button>
                </a>
                <a href={buyHref} style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
                  Mua theme (sau trial) →
                </a>
              </div>
            </Panel>
          );
        })}
      </div>

      {!templates.length ? (
        <p style={{ opacity: 0.7 }}>Chưa tải được catalog — kiểm tra API public templates.</p>
      ) : null}
    </main>
  );
}
