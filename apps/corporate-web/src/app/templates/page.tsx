import Link from 'next/link';
import { TemplateProductCard } from '../../components/TemplateProductCard';
import {
  facetHref,
  fetchTemplateFacets,
  fetchTemplates,
} from '../../lib/marketplace';

export const dynamic = 'force-dynamic';

const INDUSTRY_CARDS: Array<{ key: string; label: string; mark: string }> = [
  { key: 'fashion', label: 'Thời trang', mark: 'Tf' },
  { key: 'electronics', label: 'Công nghệ - Điện tử', mark: 'Tech' },
  { key: 'beauty', label: 'Mỹ phẩm - Làm đẹp', mark: 'Be' },
  { key: 'b2b', label: 'Doanh nghiệp', mark: 'Biz' },
  { key: 'home', label: 'Nội thất & Gia dụng', mark: 'Home' },
  { key: 'jewelry', label: 'Trang sức & Quà tặng', mark: 'Jw' },
  { key: 'fnb', label: 'Nhà hàng - Quán ăn', mark: 'F&B' },
  { key: 'health', label: 'Chăm sóc sức khoẻ', mark: 'Care' },
  { key: 'pets', label: 'Thú cưng', mark: 'Pet' },
  { key: 'general', label: 'Tạp hoá - Nhiều mặt hàng', mark: 'Shop' },
];

const GOAL_PILLS: Array<{ key?: string; label: string }> = [
  { key: undefined, label: 'Tất cả' },
  { key: 'conversion', label: 'Website bán hàng' },
  { key: 'brand', label: 'Thương hiệu' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'lead', label: 'Lead gen' },
  { key: 'local', label: 'Local / POS' },
];

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

  const countLabel = templates.length;
  const heroTitle = sp.goal
    ? `${countLabel}+ Giao diện website ${sp.goal === 'conversion' ? 'bán hàng' : sp.goal} đẹp mắt, chuyên nghiệp`
    : `${countLabel}+ Giao diện website bán hàng và doanh nghiệp đẹp mắt, chuyên nghiệp`;

  return (
    <main className="hv-page">
      <section className="hv-hero">
        <div className="hv-hero-inner">
          <div className="hv-hero-copy">
            <h1>{heroTitle}</h1>
            <p>
              Từ thiết kế tinh tế, hiện đại đến phong cách trẻ trung, năng động — kho giao diện
              WebCom cập nhật liên tục, chuẩn SEO, có demo live và dùng thử trước khi mua.
            </p>
            <form className="hv-hero-search" action="/templates" method="get">
              {sp.goal ? <input type="hidden" name="goal" value={sp.goal} /> : null}
              <input
                type="search"
                name="q"
                defaultValue={sp.q || ''}
                placeholder="Tìm giao diện"
                aria-label="Tìm giao diện"
              />
              <button type="submit" aria-label="Tìm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </form>
          </div>
          <div className="hv-hero-collage" aria-hidden>
            <div className="hv-collage-card c1" />
            <div className="hv-collage-card c2" />
            <div className="hv-collage-card c3" />
            <div className="hv-collage-badge">
              <strong>Trial</strong>
              <span>trước paywall</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hv-section">
        <div className="hv-section-head">
          <h2>Giao diện website theo ngành hàng phổ biến</h2>
          <p>
            Những mẫu giao diện phù hợp mọi ngành nghề, chuẩn SEO, giúp khách hàng có trải nghiệm
            tốt.
          </p>
        </div>
        <div className="hv-industry-grid">
          {INDUSTRY_CARDS.map((c) => {
            const available = !facets.industries.length || facets.industries.includes(c.key);
            if (!available && facets.industries.length) return null;
            return (
              <Link
                key={c.key}
                href={facetHref(base, { industry: c.key })}
                className={`hv-industry${sp.industry === c.key ? ' active' : ''}`}
              >
                <span className="hv-industry-ico" aria-hidden>
                  {c.mark}
                </span>
                <span>{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="hv-section hv-section-soft" id="catalog">
        <div className="hv-section-head">
          <h2>
            {sp.license === 'free'
              ? 'Giao diện miễn phí'
              : sp.goal === 'conversion'
                ? 'Giao diện website bán hàng'
                : 'Giao diện mới cập nhật'}
          </h2>
          <p>
            Khám phá {countLabel} giao diện
            {sp.industry ? ` · ngành ${sp.industry}` : ''}
            {sp.goal ? ` · mục tiêu ${sp.goal}` : ''} — xem thực tế, dùng thử, rồi mua khi sẵn sàng.
          </p>
        </div>

        <div className="hv-pills" role="navigation" aria-label="Lọc mục tiêu">
          {GOAL_PILLS.map((p) => (
            <Link
              key={p.label}
              href={facetHref(base, { goal: p.key })}
              className={`hv-pill${(p.key || '') === (sp.goal || '') ? ' active' : ''}`}
            >
              {p.label}
            </Link>
          ))}
          <Link
            href={facetHref(base, { license: sp.license === 'free' ? undefined : 'free' })}
            className={`hv-pill${sp.license === 'free' ? ' active' : ''}`}
          >
            Miễn phí
          </Link>
          <Link
            href={facetHref(base, { license: sp.license === 'one_time' ? undefined : 'one_time' })}
            className={`hv-pill${sp.license === 'one_time' ? ' active' : ''}`}
          >
            One-time
          </Link>
        </div>

        <div className="hv-toolbar">
          <p>
            <strong>{countLabel}</strong> giao diện
          </p>
          <div className="hv-sort">
            {(['cvr', 'mobile', 'seo'] as const).map((s) => (
              <Link
                key={s}
                href={facetHref(base, { sort: s })}
                className={sort === s ? 'active' : ''}
              >
                {s === 'cvr' ? 'Phổ biến' : s === 'mobile' ? 'Mobile' : 'SEO'}
              </Link>
            ))}
          </div>
        </div>

        {templates.length ? (
          <div className="hv-grid">
            {templates.map((t, idx) => (
              <TemplateProductCard
                key={t.id}
                t={t}
                badge={
                  t.license === 'free'
                    ? 'Miễn phí'
                    : idx === 0
                      ? 'Mới'
                      : t.goal === 'conversion' && idx < 3
                        ? 'One page'
                        : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="hv-empty">
            <h3>Chưa có giao diện khớp bộ lọc</h3>
            <p>Thử đổi ngành hoặc mục tiêu khác.</p>
            <Link href="/templates" className="hv-btn hv-btn-primary">
              Xem tất cả
            </Link>
          </div>
        )}
      </section>

      <section className="hv-cta">
        <div className="hv-cta-inner">
          <h2>Dễ dàng bắt đầu với giao diện WebCom</h2>
          <p>Trial miễn phí trước — mua theme khi storefront đã chạy ổn.</p>
          <div className="hv-cta-actions">
            <Link href="/trial" className="hv-btn hv-btn-primary">
              Bắt đầu miễn phí
            </Link>
            <Link href="/pricing" className="hv-btn hv-btn-outline-light">
              Xem pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
