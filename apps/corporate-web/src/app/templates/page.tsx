import Link from 'next/link';
import { TemplateProductCard } from '../../components/TemplateProductCard';
import { INDUSTRY_ICONS, IconSearch, IconSpark } from '../../components/ThemeIcons';
import {
  facetHref,
  fetchTemplateFacets,
  fetchTemplates,
} from '../../lib/marketplace';

export const dynamic = 'force-dynamic';

const INDUSTRY_CARDS: Array<{ key: string; label: string }> = [
  { key: 'fashion', label: 'Thời trang' },
  { key: 'electronics', label: 'Công nghệ - Điện tử' },
  { key: 'beauty', label: 'Mỹ phẩm - Làm đẹp' },
  { key: 'b2b', label: 'Doanh nghiệp' },
  { key: 'home', label: 'Nội thất & Gia dụng' },
  { key: 'jewelry', label: 'Trang sức & Quà tặng' },
  { key: 'fnb', label: 'Nhà hàng - Quán ăn' },
  { key: 'health', label: 'Chăm sóc sức khoẻ' },
  { key: 'pets', label: 'Thú cưng' },
  { key: 'general', label: 'Tạp hoá - Nhiều mặt hàng' },
];

const INDUSTRY_LABEL = Object.fromEntries(INDUSTRY_CARDS.map((c) => [c.key, c.label]));

const GOAL_PILLS: Array<{ key?: string; label: string }> = [
  { key: undefined, label: 'Tất cả' },
  { key: 'conversion', label: 'Website bán hàng' },
  { key: 'brand', label: 'Thương hiệu' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'lead', label: 'Lead gen' },
  { key: 'local', label: 'Local / POS' },
];

const GOAL_LABEL: Record<string, string> = {
  conversion: 'website bán hàng',
  brand: 'thương hiệu',
  campaign: 'campaign',
  lead: 'lead gen',
  local: 'local / POS',
};

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

  const visibleIndustries = INDUSTRY_CARDS.filter(
    (c) => !facets.industries.length || facets.industries.includes(c.key),
  );

  const countLabel = templates.length;
  const goalPhrase = sp.goal ? GOAL_LABEL[sp.goal] || sp.goal : 'bán hàng và doanh nghiệp';
  const heroTitle = `${Math.max(countLabel, 1)}+ Giao diện website ${goalPhrase} đẹp mắt, chuyên nghiệp`;

  const activeChips: Array<{ href: string; label: string }> = [];
  if (sp.industry) {
    activeChips.push({
      href: facetHref(base, { industry: undefined }) + '#catalog',
      label: INDUSTRY_LABEL[sp.industry] || sp.industry,
    });
  }
  if (sp.goal) {
    activeChips.push({
      href: facetHref(base, { goal: undefined }) + '#catalog',
      label: GOAL_PILLS.find((g) => g.key === sp.goal)?.label || sp.goal,
    });
  }
  if (sp.license === 'free') {
    activeChips.push({
      href: facetHref(base, { license: undefined }) + '#catalog',
      label: 'Miễn phí',
    });
  }
  if (sp.license === 'one_time') {
    activeChips.push({
      href: facetHref(base, { license: undefined }) + '#catalog',
      label: 'One-time',
    });
  }
  if (sp.q) {
    activeChips.push({
      href: facetHref(base, { q: undefined }) + '#catalog',
      label: `“${sp.q}”`,
    });
  }

  const catalogTitle = sp.license === 'free'
    ? 'Giao diện miễn phí'
    : sp.industry
      ? `Giao diện ${INDUSTRY_LABEL[sp.industry] || sp.industry}`
      : sp.goal === 'conversion'
        ? 'Giao diện website bán hàng'
        : 'Giao diện mới cập nhật';

  return (
    <main className="hv-page">
      <section className="hv-hero">
        <div className="hv-hero-inner">
          <div className="hv-hero-copy hv-anim">
            <p className="hv-hero-kicker">
              <IconSpark />
              Kho giao diện WebCom
            </p>
            <h1>{heroTitle}</h1>
            <p>
              Từ thiết kế tinh tế đến phong cách năng động — chuẩn SEO, demo live, dùng thử trước
              khi mua.
            </p>
            <form className="hv-hero-search" action="/templates" method="get">
              {sp.goal ? <input type="hidden" name="goal" value={sp.goal} /> : null}
              {sp.industry ? <input type="hidden" name="industry" value={sp.industry} /> : null}
              <input
                type="search"
                name="q"
                defaultValue={sp.q || ''}
                placeholder="Tìm giao diện theo tên, ngành…"
                aria-label="Tìm giao diện"
              />
              <button type="submit" aria-label="Tìm">
                <IconSearch />
              </button>
            </form>
            <div className="hv-hero-hints">
              <a href="#industries">Chọn ngành</a>
              <span aria-hidden>·</span>
              <a href="#catalog">Xem catalog</a>
              <span aria-hidden>·</span>
              <Link href="/trial">Bắt đầu trial</Link>
            </div>
          </div>
          <div className="hv-hero-collage" aria-hidden>
            <div className="hv-collage-card c1">
              <div className="hv-collage-ui">
                <i />
                <i />
                <b />
              </div>
            </div>
            <div className="hv-collage-card c2">
              <div className="hv-collage-ui">
                <i />
                <b />
                <i />
              </div>
            </div>
            <div className="hv-collage-card c3">
              <div className="hv-collage-ui">
                <b />
                <i />
                <i />
              </div>
            </div>
            <div className="hv-collage-badge">
              <strong>60K+</strong>
              <span>storefront sẵn sàng</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hv-section" id="industries">
        <div className="hv-section-head hv-anim">
          <h2>Giao diện website theo ngành hàng phổ biến</h2>
          <p>
            Chọn ngành để lọc catalog bên dưới — mẫu chuẩn SEO, tối ưu trải nghiệm mua hàng.
          </p>
        </div>
        <div className="hv-industry-grid">
          {visibleIndustries.map((c, i) => {
            const Icon = INDUSTRY_ICONS[c.key];
            const active = sp.industry === c.key;
            return (
              <Link
                key={c.key}
                href={`${facetHref(base, { industry: active ? undefined : c.key })}#catalog`}
                className={`hv-industry hv-anim${active ? ' active' : ''}`}
                style={{ animationDelay: `${0.04 * i}s` }}
                aria-current={active ? 'true' : undefined}
              >
                <span className="hv-industry-ico">{Icon ? <Icon /> : null}</span>
                <span className="hv-industry-label">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="hv-section hv-section-soft" id="catalog">
        <div className="hv-section-head hv-anim">
          <h2>{catalogTitle}</h2>
          <p>
            {countLabel} giao diện sẵn sàng xem thực tế
            {sp.industry ? ` trong ${INDUSTRY_LABEL[sp.industry] || sp.industry}` : ''}
            {sp.goal ? ` · ${GOAL_LABEL[sp.goal] || sp.goal}` : ''}.
          </p>
        </div>

        <div className="hv-pills" role="navigation" aria-label="Lọc mục tiêu">
          {GOAL_PILLS.map((p) => (
            <Link
              key={p.label}
              href={`${facetHref(base, { goal: p.key })}#catalog`}
              className={`hv-pill${(p.key || '') === (sp.goal || '') ? ' active' : ''}`}
            >
              {p.label}
            </Link>
          ))}
          <span className="hv-pill-sep" aria-hidden />
          <Link
            href={`${facetHref(base, {
              license: sp.license === 'free' ? undefined : 'free',
            })}#catalog`}
            className={`hv-pill${sp.license === 'free' ? ' active' : ''}`}
          >
            Miễn phí
          </Link>
          <Link
            href={`${facetHref(base, {
              license: sp.license === 'one_time' ? undefined : 'one_time',
            })}#catalog`}
            className={`hv-pill${sp.license === 'one_time' ? ' active' : ''}`}
          >
            One-time
          </Link>
        </div>

        <div className="hv-toolbar">
          <div className="hv-toolbar-left">
            <p>
              <strong>{countLabel}</strong> giao diện
            </p>
            {activeChips.length ? (
              <div className="hv-active-chips">
                {activeChips.map((c) => (
                  <Link key={c.label} href={c.href} className="hv-chip-x">
                    {c.label}
                    <span aria-hidden>×</span>
                  </Link>
                ))}
                <Link href="/templates#catalog" className="hv-clear">
                  Xóa lọc
                </Link>
              </div>
            ) : null}
          </div>
          <div className="hv-sort" role="group" aria-label="Sắp xếp">
            {(['cvr', 'mobile', 'seo'] as const).map((s) => (
              <Link
                key={s}
                href={`${facetHref(base, { sort: s })}#catalog`}
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
                  t.license === 'free' || t.license_tier === 'free'
                    ? 'Miễn phí'
                    : idx === 0
                      ? 'Mới'
                      : idx < 3
                        ? 'Hot'
                        : undefined
                }
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="hv-empty">
            <h3>Chưa có giao diện khớp bộ lọc</h3>
            <p>Bỏ bớt ngành / mục tiêu hoặc xem toàn bộ catalog.</p>
            <Link href="/templates#catalog" className="hv-btn hv-btn-primary">
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
