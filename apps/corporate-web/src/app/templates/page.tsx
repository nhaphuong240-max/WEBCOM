import Link from 'next/link';
import { TemplateProductCard } from '../../components/TemplateProductCard';
import {
  facetHref,
  fetchTemplateFacets,
  fetchTemplates,
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
    <main className="corp-page tm-catalog">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Marketplace</div>
        <h1>
          {templates.length.toLocaleString('vi-VN')} Website Templates
        </h1>
        <p>
          Lọc theo ngành · mục tiêu · license. Mỗi template có live demo, trial và mua one-time —
          giống trải nghiệm marketplace premium.
        </p>
      </div>

      {sp.q ? (
        <p className="mkt-count">
          Kết quả cho “{sp.q}” ·{' '}
          <Link href="/templates" style={{ color: 'var(--tm-blue)', fontWeight: 700 }}>
            Xóa tìm kiếm
          </Link>
        </p>
      ) : null}

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

      <div className="tm-product-rail tm-catalog-grid">
        {templates.map((t, idx) => (
          <TemplateProductCard
            key={t.id}
            t={t}
            badge={idx < 2 ? 'Hot' : idx < 4 ? 'Bestseller' : undefined}
          />
        ))}
      </div>

      {!templates.length ? (
        <p style={{ color: 'var(--ink-3)', marginTop: 24 }}>
          Không có template khớp bộ lọc — thử bỏ bớt facet.
        </p>
      ) : null}
    </main>
  );
}
