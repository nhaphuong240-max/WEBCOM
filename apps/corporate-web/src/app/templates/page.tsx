import Link from 'next/link';
import { TemplateProductCard } from '../../components/TemplateProductCard';
import {
  facetHref,
  fetchTemplateFacets,
  fetchTemplates,
} from '../../lib/marketplace';

export const dynamic = 'force-dynamic';

const GOAL_LABEL: Record<string, string> = {
  conversion: 'Conversion',
  brand: 'Brand',
  campaign: 'Campaign',
  lead: 'Lead gen',
  local: 'Local / POS',
  live: 'Live commerce',
  omnichannel: 'Omnichannel',
  retention: 'Retention',
  leadgen: 'Lead gen',
};

const INDUSTRY_LABEL: Record<string, string> = {
  beauty: 'Beauty',
  fashion: 'Fashion',
  fnb: 'F&B',
  sports: 'Sports',
  pets: 'Pets',
  home: 'Home',
  kids: 'Kids',
  edu: 'Education',
  books: 'Books',
  b2b: 'B2B',
  health: 'Health',
  electronics: 'Electronics',
  auto: 'Auto',
  jewelry: 'Jewelry',
  organic: 'Organic',
  travel: 'Travel',
  social: 'Social',
  realestate: 'Real estate',
  services: 'Services',
  agency: 'Agency',
  general: 'General',
};

const LICENSE_LABEL: Record<string, string> = {
  free: 'Miễn phí',
  one_time: 'One-time',
};

const SORT_LABEL: Record<string, string> = {
  cvr: 'Conversion',
  mobile: 'Mobile',
  seo: 'SEO',
};

function labelOf(map: Record<string, string>, key: string) {
  return map[key] || key;
}

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

  const activeFilters: Array<{ key: string; label: string; href: string }> = [];
  if (sp.industry) {
    activeFilters.push({
      key: 'industry',
      label: labelOf(INDUSTRY_LABEL, sp.industry),
      href: facetHref(base, { industry: undefined }),
    });
  }
  if (sp.goal) {
    activeFilters.push({
      key: 'goal',
      label: labelOf(GOAL_LABEL, sp.goal),
      href: facetHref(base, { goal: undefined }),
    });
  }
  if (sp.license) {
    activeFilters.push({
      key: 'license',
      label: labelOf(LICENSE_LABEL, sp.license),
      href: facetHref(base, { license: undefined }),
    });
  }
  if (sp.q) {
    activeFilters.push({
      key: 'q',
      label: `“${sp.q}”`,
      href: facetHref(base, { q: undefined }),
    });
  }

  const titleGoal = sp.goal ? labelOf(GOAL_LABEL, sp.goal) : null;
  const titleIndustry = sp.industry ? labelOf(INDUSTRY_LABEL, sp.industry) : null;
  const pageTitle = [titleIndustry, titleGoal, 'Website Templates'].filter(Boolean).join(' · ');

  return (
    <main className="cat-page">
      <section className="cat-hero">
        <div className="cat-hero-inner">
          <nav className="cat-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">WebCom</Link>
            <span>/</span>
            <Link href="/templates">Templates</Link>
            {sp.goal ? (
              <>
                <span>/</span>
                <span>{labelOf(GOAL_LABEL, sp.goal)}</span>
              </>
            ) : null}
          </nav>
          <div className="cat-hero-row">
            <div>
              <p className="cat-kicker">Marketplace</p>
              <h1>{pageTitle}</h1>
              <p className="cat-lead">
                Theme sẵn demo live + trial. Lọc theo ngành, mục tiêu và license — chọn, thử, rồi mua
                khi sẵn sàng go-live.
              </p>
            </div>
            <div className="cat-hero-stats" aria-label="Tóm tắt catalog">
              <div>
                <strong>{templates.length}</strong>
                <span>kết quả</span>
              </div>
              <div>
                <strong>{facets.industries.length || '—'}</strong>
                <span>ngành</span>
              </div>
              <div>
                <strong>Trial</strong>
                <span>trước paywall</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cat-shell">
        <aside className="cat-sidebar" aria-label="Bộ lọc">
          <div className="cat-side-block">
            <div className="cat-side-title">Ngành</div>
            <div className="cat-side-list">
              <Link
                href={facetHref(base, { industry: undefined })}
                className={`cat-side-item${!sp.industry ? ' active' : ''}`}
              >
                Tất cả
              </Link>
              {facets.industries.map((i) => (
                <Link
                  key={i}
                  href={facetHref(base, { industry: i })}
                  className={`cat-side-item${sp.industry === i ? ' active' : ''}`}
                >
                  {labelOf(INDUSTRY_LABEL, i)}
                </Link>
              ))}
            </div>
          </div>

          <div className="cat-side-block">
            <div className="cat-side-title">Mục tiêu</div>
            <div className="cat-side-list">
              <Link
                href={facetHref(base, { goal: undefined })}
                className={`cat-side-item${!sp.goal ? ' active' : ''}`}
              >
                Tất cả
              </Link>
              {facets.goals.map((g) => (
                <Link
                  key={g}
                  href={facetHref(base, { goal: g })}
                  className={`cat-side-item${sp.goal === g ? ' active' : ''}`}
                >
                  {labelOf(GOAL_LABEL, g)}
                </Link>
              ))}
            </div>
          </div>

          <div className="cat-side-block">
            <div className="cat-side-title">License</div>
            <div className="cat-side-list">
              <Link
                href={facetHref(base, { license: undefined })}
                className={`cat-side-item${!sp.license ? ' active' : ''}`}
              >
                Tất cả
              </Link>
              {facets.licenses.map((l) => (
                <Link
                  key={l}
                  href={facetHref(base, { license: l })}
                  className={`cat-side-item${sp.license === l ? ' active' : ''}`}
                >
                  {labelOf(LICENSE_LABEL, l)}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section className="cat-main">
          <div className="cat-toolbar">
            <div className="cat-toolbar-left">
              <p className="cat-count">
                <strong>{templates.length}</strong> template
                {templates.length === 1 ? '' : 's'}
                {activeFilters.length ? ' · đã lọc' : ''}
              </p>
              {activeFilters.length ? (
                <div className="cat-active">
                  {activeFilters.map((f) => (
                    <Link key={f.key} href={f.href} className="cat-active-chip">
                      {f.label}
                      <span aria-hidden>×</span>
                    </Link>
                  ))}
                  <Link href="/templates" className="cat-clear">
                    Xóa lọc
                  </Link>
                </div>
              ) : null}
            </div>
            <div className="cat-sort" role="group" aria-label="Sắp xếp">
              <span>Sort</span>
              {(['cvr', 'mobile', 'seo'] as const).map((s) => (
                <Link
                  key={s}
                  href={facetHref(base, { sort: s })}
                  className={`cat-sort-btn${sort === s ? ' active' : ''}`}
                >
                  {SORT_LABEL[s]}
                </Link>
              ))}
            </div>
          </div>

          {templates.length ? (
            <div className="cat-grid">
              {templates.map((t, idx) => (
                <TemplateProductCard
                  key={t.id}
                  t={t}
                  badge={idx === 0 ? 'Top CVR' : idx < 3 ? 'Popular' : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="cat-empty">
              <h2>Không có template khớp bộ lọc</h2>
              <p>Thử bỏ bớt ngành / mục tiêu, hoặc xem toàn bộ catalog.</p>
              <Link href="/templates" className="tm-btn tm-btn-primary">
                Xem tất cả templates
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
