import type { Metadata } from 'next';
import { SectionStackPlatform } from '../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../lib/platform-cms';
import { LeadForm } from '../../components/HeroConcierge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WebCom — Website Commerce for Vietnam retail',
  description:
    'Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS. Browse templates, start a trial, or book a demo.',
};

export default async function EnHome({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const platformPage = await fetchPlatformPage('home', {
    siteKey: 'webcom_en',
    previewToken: sp.preview,
  });
  const useCms =
    Boolean(platformPage?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  return (
    <main className="tm-home" lang="en">
      {useCms && platformPage?.content_v1 ? (
        <SectionStackPlatform
          content={platformPage.content_v1}
          experimentCode={platformPage.experiment_code}
          experiment={platformPage.experiment}
          storefrontId={platformPage.interim_storefront_id}
        />
      ) : (
        <section className="pcms-hero">
          <div className="pcms-hero-copy">
            <h1 className="pcms-hero-title">Website Commerce for Vietnam retail</h1>
            <p className="pcms-hero-sub">
              Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS
            </p>
            <div className="pcms-hero-ctas">
              <a className="hv-btn hv-btn-primary" href="/templates">
                Browse templates
              </a>
              <a className="hv-btn hv-btn-outline" href="/trial">
                Start trial
              </a>
            </div>
          </div>
        </section>
      )}
      <section className="tm-section" id="lead">
        <div className="tm-section-head">
          <h2>Book a demo</h2>
          <p>Tell us about your brand — sales responds within business hours.</p>
        </div>
        <LeadForm />
      </section>
    </main>
  );
}
