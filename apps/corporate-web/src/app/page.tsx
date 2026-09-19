import Link from 'next/link';
import { HeroConcierge, LeadForm } from '../components/HeroConcierge';
import { TemplateProductCard } from '../components/TemplateProductCard';
import { SectionStackPlatform } from '../components/platform/SectionStackPlatform';
import { fetchTemplates } from '../lib/marketplace';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../lib/platform-cms';

export const dynamic = 'force-dynamic';

const CATEGORY_TILES = [
  {
    title: 'Website Commerce',
    body: 'Theme HTML/Next storefront · Brand Kit · Go-live gate',
    count: '30+ playbooks',
    href: '/templates?goal=conversion',
    tone: 'blue' as const,
  },
  {
    title: 'Live & Social',
    body: 'Live drop, keyword order, attribution realtime',
    count: 'Live kits',
    href: '/templates?goal=live',
    tone: 'green' as const,
  },
  {
    title: 'Beauty & Fashion',
    body: 'Aura, Atelier và theme ngành bán lẻ VN',
    count: 'Industry packs',
    href: '/templates?industry=beauty',
    tone: 'rose' as const,
  },
  {
    title: 'Omnichannel POS',
    body: 'Giá · tồn · khách web ↔ quầy',
    count: 'POS ready',
    href: '/templates?goal=omnichannel',
    tone: 'amber' as const,
  },
];

export default async function CorporateHome({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const platformPage = await fetchPlatformPage('home', {
    previewToken: sp.preview,
  });
  const useCms =
    Boolean(platformPage?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  const templates = await fetchTemplates({ sort: 'cvr' });
  const hot = templates.slice(0, 5);
  const best = templates.slice(0, 5);
  const featured = [...templates].reverse().slice(0, 5);

  return (
    <main className="tm-home">
      {useCms && platformPage?.content_v1 ? (
        <SectionStackPlatform content={platformPage.content_v1} />
      ) : (
        <>
          <HeroConcierge />
          <section className="tm-section" id="categories">
            <div className="tm-section-head">
              <h2>Website Templates, Theme & Playbook Marketplace</h2>
              <p>Catalog công khai — demo live, trial self-serve, mua license khi sẵn sàng.</p>
            </div>
            <div className="tm-cat-tiles">
              {CATEGORY_TILES.map((c) => (
                <Link key={c.title} href={c.href} className={`tm-cat-tile tone-${c.tone}`}>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                  <span>{c.count}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="tm-section tm-section-muted" id="hot">
        <div className="tm-section-head row">
          <div>
            <h2>Hot this week</h2>
            <p>Theme đang được xem demo nhiều nhất trên WebCom.</p>
          </div>
          <Link href="/templates" className="tm-link-more">
            Browse all products →
          </Link>
        </div>
        <div className="tm-product-rail">
          {hot.map((t) => (
            <TemplateProductCard key={t.id} t={t} badge="Hot" />
          ))}
          {!hot.length ? <p className="tm-empty">Chưa có template — kiểm tra API public.</p> : null}
        </div>
      </section>

      <section className="tm-section" id="bestsellers">
        <div className="tm-section-head row">
          <div>
            <h2>Bestsellers</h2>
            <p>Top website templates theo điểm CVR / mobile / SEO.</p>
          </div>
          <Link href="/templates?sort=cvr" className="tm-link-more">
            View bestsellers →
          </Link>
        </div>
        <div className="tm-product-rail">
          {best.map((t) => (
            <TemplateProductCard key={`b-${t.id}`} t={t} badge="Bestseller" />
          ))}
        </div>
      </section>

      {!useCms ? (
        <section className="tm-unlimited">
          <div className="tm-unlimited-inner">
            <div>
              <p className="tm-hero-eyebrow">WebCom Unlimited</p>
              <h2>Một gói — dùng cho mọi dự án sáng tạo</h2>
              <ul>
                <li>Unlimited projects</li>
                <li>Product support</li>
                <li>Theme mới mỗi tuần</li>
                <li>Trial trước paywall · VietQR</li>
              </ul>
              <Link href="/pricing" className="tm-btn tm-btn-primary">
                Xem Unlimited
              </Link>
            </div>
            <div className="tm-unlimited-card" aria-hidden>
              <div className="n">∞</div>
              <div className="t">Downloads</div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="tm-section tm-section-muted" id="featured">
        <div className="tm-section-head row">
          <div>
            <h2>Featured</h2>
            <p>Theme được đội WebCom chọn tay — layout sạch, go-live gate sẵn.</p>
          </div>
          <Link href="/templates" className="tm-link-more">
            Explore featured →
          </Link>
        </div>
        <div className="tm-product-rail">
          {featured.map((t) => (
            <TemplateProductCard key={`f-${t.id}`} t={t} badge="Featured" />
          ))}
        </div>
      </section>

      <section className="tm-cta-band" id="lead">
        <h2>Sẵn sàng mở storefront?</h2>
        <p>Trial miễn phí trước — mua theme khi đã chạy được. Hoặc để sales đồng hành.</p>
        <div className="tm-cta-actions">
          <Link href="/trial" className="tm-btn tm-btn-primary">
            Dùng thử ngay
          </Link>
          <Link href="/templates" className="tm-btn tm-btn-ghost-light">
            Xem templates
          </Link>
        </div>
        <LeadForm ctaCode="cta_book_demo" landingSlug="/" />
      </section>
    </main>
  );
}
