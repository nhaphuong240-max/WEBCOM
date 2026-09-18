import Link from 'next/link';
import {
  buyUrl,
  demoUrl,
  facetHref,
  fetchTemplateFacets,
  fetchTemplates,
  trialUrl,
} from '../../lib/marketplace';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    industry?: string;
    goal?: string;
    license?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const sp = (await searchParams) || {};
  const sort = sp.sort || 'cvr';
  const filters = {
    industry: sp.industry,
    goal: sp.goal,
    license: sp.license,
    sort,
    q: sp.q,
  };
  const [templates, facets] = await Promise.all([
    fetchTemplates(filters),
    fetchTemplateFacets(),
  ]);
  const base = {
    industry: sp.industry,
    goal: sp.goal,
    license: sp.license,
    sort,
    q: sp.q,
  };

  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Marketplace</div>
        <h1>Template Marketplace</h1>
        <p>
          Lọc theo ngành · mục tiêu · license · sort CVR/Mobile/SEO. Mỗi template có demo live và
          trial — ThemePackage chung một CMS.
        </p>
      </div>

      <section className="mkt-facets" aria-label="Bộ lọc">
        <div className="mkt-facet-group">
          <span className="mkt-facet-label">Ngành</span>
          <div className="corp-chip-row" style={{ marginBottom: 0 }}>
            <Link
              href={facetHref(base, { industry: undefined })}
              className={`corp-chip${!sp.industry ? ' active' : ''}`}
            >
              All
            </Link>
            {facets.industries.map((i) => (
              <Link
                key={i}
                href={facetHref(base, { industry: i })}
                className={`corp-chip${sp.industry === i ? ' active' : ''}`}
              >
                {i}
              </Link>
            ))}
          </div>
        </div>

        <div className="mkt-facet-group">
          <span className="mkt-facet-label">Mục tiêu</span>
          <div className="corp-chip-row" style={{ marginBottom: 0 }}>
            <Link
              href={facetHref(base, { goal: undefined })}
              className={`corp-chip${!sp.goal ? ' active' : ''}`}
            >
              All
            </Link>
            {facets.goals.map((g) => (
              <Link
                key={g}
                href={facetHref(base, { goal: g })}
                className={`corp-chip${sp.goal === g ? ' active' : ''}`}
              >
                {g}
              </Link>
            ))}
          </div>
        </div>

        <div className="mkt-facet-group">
          <span className="mkt-facet-label">License</span>
          <div className="corp-chip-row" style={{ marginBottom: 0 }}>
            <Link
              href={facetHref(base, { license: undefined })}
              className={`corp-chip${!sp.license ? ' active' : ''}`}
            >
              All
            </Link>
            {facets.licenses.map((l) => (
              <Link
                key={l}
                href={facetHref(base, { license: l })}
                className={`corp-chip${sp.license === l ? ' active' : ''}`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>

        <div className="mkt-facet-group">
          <span className="mkt-facet-label">Sort</span>
          <div className="corp-chip-row" style={{ marginBottom: 0 }}>
            {(['cvr', 'mobile', 'seo'] as const).map((s) => (
              <Link
                key={s}
                href={facetHref(base, { sort: s })}
                className={`corp-chip${sort === s ? ' active' : ''}`}
              >
                {s.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <p className="mkt-count">
        {templates.length} template{templates.length === 1 ? '' : 's'}
        {sp.industry || sp.goal || sp.license ? ' · đã lọc' : ''}
      </p>

      <div className="corp-card-grid">
        {templates.map((t) => {
          const href = `/templates/${encodeURIComponent(t.code)}`;
          return (
            <article key={t.id} className="corp-card">
              <div className="meta">
                <span className="tag">{t.industry}</span>
                <span className="tag tag-accent">{t.goal}</span>
                <span className="tag">{t.license}</span>
                {t.has_package ? <span className="tag">package</span> : null}
              </div>
              <h3>
                <Link href={href}>{t.name}</Link>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
                CVR {t.scores?.cvr ?? '—'} · Mobile {t.scores?.mobile ?? '—'} · SEO{' '}
                {t.scores?.seo ?? '—'}
              </p>
              {t.supports && t.supports.length > 0 ? (
                <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.45 }}>
                  supports: {t.supports.slice(0, 5).join(', ')}
                  {t.supports.length > 5 ? '…' : ''}
                </p>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                <Link href={href} className="corp-btn corp-btn-ink">
                  Xem chi tiết
                </Link>
                <a
                  href={demoUrl(t.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="corp-btn corp-btn-ghost"
                >
                  Demo live
                </a>
                <a href={trialUrl(t.code)} className="corp-btn corp-btn-primary">
                  Dùng thử miễn phí
                </a>
                <a
                  href={buyUrl(t.code)}
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-3)',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  Mua theme →
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {!templates.length ? (
        <p style={{ color: 'var(--ink-3)', marginTop: 24 }}>
          Không có template khớp bộ lọc — thử bỏ bớt facet.
        </p>
      ) : null}
    </main>
  );
}
