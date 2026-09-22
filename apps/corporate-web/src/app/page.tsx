import Link from 'next/link';
import { GtmHome } from '../components/GtmHome';
import { LeadForm } from '../components/HeroConcierge';
import { SectionStackPlatform } from '../components/platform/SectionStackPlatform';
import { TemplateProductCard } from '../components/TemplateProductCard';
import { fetchTemplates } from '../lib/marketplace';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function CorporateHome({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const platformPage = await fetchPlatformPage('home', {
    previewToken: sp.preview,
  });
  // Home always uses full GTM narrative (mockup 01). CMS only for explicit preview.
  const useCms =
    Boolean(sp.preview) &&
    Boolean(platformPage?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  const templates = await fetchTemplates({ sort: 'cvr' });
  const hot = templates.slice(0, 4);

  return (
    <main>
      {useCms && platformPage?.content_v1 ? (
        <>
          <SectionStackPlatform
            content={platformPage.content_v1}
            experimentCode={platformPage.experiment_code}
            experiment={platformPage.experiment}
            storefrontId={platformPage.interim_storefront_id}
          />
          <section className="gtm-sec gtm-demo" id="demo">
            <div className="gtm-narrow gtm-demo-grid">
              <div className="gtm-sec-h" style={{ margin: 0 }}>
                <div className="gtm-eyebrow">Bắt đầu</div>
                <h2>Đặt demo 30 phút theo ngành của bạn</h2>
                <p>
                  Tour Command Center, Website Go-live và Social/Live. So sánh margin vs chỉ nhìn
                  GMV.
                </p>
              </div>
              <LeadForm ctaCode="cta_book_demo" landingSlug="/" />
            </div>
          </section>
        </>
      ) : (
        <GtmHome locale="vi" />
      )}

      <section
        className="gtm-sec gtm-channels"
        id="templates"
        style={{ paddingTop: 64, paddingBottom: 64 }}
      >
        <div className="gtm-narrow">
          <div className="gtm-sec-h" style={{ marginBottom: 28 }}>
            <div className="gtm-eyebrow">Website Commerce</div>
            <h2>Template Marketplace</h2>
            <p>Playbook đo CVR / Mobile / SEO — demo live, trial trước paywall.</p>
          </div>
          <div className="tm-product-rail">
            {hot.map((t) => (
              <TemplateProductCard key={t.id} t={t} badge="Hot" />
            ))}
            {!hot.length ? <p className="tm-empty">Chưa có template — kiểm tra API public.</p> : null}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/templates" className="gtm-btn gtm-btn-primary">
              Xem tất cả templates
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
