import Link from 'next/link';

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
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Marketplace</div>
        <h1>Template Marketplace</h1>
        <p>Chọn template → xem demo live → dùng thử miễn phí → mua theme khi sẵn sàng.</p>
      </div>

      <div className="corp-chip-row">
        <Link href="/templates" className={`corp-chip${!sp.industry ? ' active' : ''}`}>
          All
        </Link>
        {industries.map((i) => (
          <Link
            key={i}
            href={`/templates?industry=${encodeURIComponent(i)}`}
            className={`corp-chip${sp.industry === i ? ' active' : ''}`}
          >
            {i}
          </Link>
        ))}
      </div>

      <div className="corp-card-grid">
        {templates.map((t) => {
          const demoHref = `${DEMO}/?demo=${encodeURIComponent(t.code)}`;
          const trialHref = `/trial${t.code ? `?template=${encodeURIComponent(t.code)}` : ''}`;
          const buyHref = `${CONSOLE}/website/templates?focus=${encodeURIComponent(t.code)}`;
          return (
            <article key={t.id} className="corp-card">
              <div className="meta">
                <span className="tag">{t.industry}</span>
                <span className="tag tag-accent">{t.goal}</span>
                <span className="tag">{t.license}</span>
              </div>
              <h3>{t.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
                CVR {t.scores?.cvr ?? '—'} · Mobile {t.scores?.mobile ?? '—'} · SEO{' '}
                {t.scores?.seo ?? '—'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                <a href={demoHref} target="_blank" rel="noreferrer" className="corp-btn corp-btn-ghost">
                  Xem demo
                </a>
                <a href={trialHref} className="corp-btn corp-btn-primary">
                  Dùng thử miễn phí
                </a>
                <a
                  href={buyHref}
                  style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 500 }}
                >
                  Mua theme (sau trial) →
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {!templates.length ? (
        <p style={{ color: 'var(--ink-3)' }}>
          Chưa tải được catalog — kiểm tra API public templates.
        </p>
      ) : null}
    </main>
  );
}
