import Link from 'next/link';
import { SectionStackPlatform } from '../../components/platform/SectionStackPlatform';
import { LeadForm } from '../../components/HeroConcierge';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../lib/platform-cms';

export const dynamic = 'force-dynamic';

function LegacyPricing() {
  return (
    <>
      <div className="corp-page-h">
        <div className="corp-eyebrow">Pricing</div>
        <h1>Gói phù hợp từng giai đoạn</h1>
        <p>
          Trial miễn phí trước — nâng cấp khi cần analytics, SLA và headless. Theme one-time mua
          riêng trên marketplace.
        </p>
      </div>

      <div className="corp-price-grid">
        {[
          {
            name: 'Theme license',
            price: 'One-time',
            featured: false,
            layer: 'theme',
            items: ['Mua trên marketplace', 'Install storefront', 'Cập nhật theo license'],
          },
          {
            name: 'Platform Growth',
            price: 'Liên hệ',
            featured: true,
            layer: 'platform',
            items: ['Analytics W4', 'Experiments', 'CRM / RFM / loyalty', 'Agency preview'],
          },
          {
            name: 'Platform Enterprise',
            price: 'Liên hệ',
            featured: false,
            layer: 'platform',
            items: ['Headless API', 'SLA 99.9%', 'DR runbooks', 'Dedicated success'],
          },
        ].map((p) => (
          <div key={p.name} className={`corp-price-card${p.featured ? ' featured' : ''}`}>
            <div className="pcms-price-layer">{p.layer}</div>
            <h2>{p.name}</h2>
            <div className="price">{p.price}</div>
            <ul>
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <Link
              href="/#lead"
              className={`corp-btn ${p.featured ? 'corp-btn-primary' : 'corp-btn-ghost'}`}
              style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
            >
              Đặt demo
            </Link>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 36, color: 'var(--ink-3)', fontSize: 14 }}>
        Theme license (one_time) thanh toán VietQR riêng — xem{' '}
        <Link href="/templates" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Template Marketplace
        </Link>
        .
      </p>
    </>
  );
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const platformPage = await fetchPlatformPage('pricing', { previewToken: sp.preview });
  const useCms =
    Boolean(platformPage?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  return (
    <main className="corp-page">
      {useCms && platformPage?.content_v1 ? (
        <SectionStackPlatform content={platformPage.content_v1} />
      ) : (
        <LegacyPricing />
      )}
      <div style={{ marginTop: 48 }} id="lead">
        <LeadForm ctaCode="cta_book_demo" landingSlug="/pricing" />
      </div>
    </main>
  );
}
