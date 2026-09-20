import type { Metadata } from 'next';
import { SectionStackPlatform } from '../../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WebCom Pricing — Theme vs Platform plans',
  description:
    'Theme licenses are one-time. Platform plans are separate. Trial first — upgrade when ready.',
};

export default async function EnPricing({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const platformPage = await fetchPlatformPage('pricing', {
    siteKey: 'webcom_en',
    previewToken: sp.preview,
  });
  const useCms =
    Boolean(platformPage?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  return (
    <main className="tm-home" lang="en">
      {useCms && platformPage?.content_v1 ? (
        <SectionStackPlatform content={platformPage.content_v1} />
      ) : (
        <section className="pcms-hero">
          <div className="pcms-hero-copy">
            <h1 className="pcms-hero-title">Plans that match your stage</h1>
            <p className="pcms-hero-sub">
              Theme licenses are one-time. Platform plans are separate.
            </p>
            <div className="pcms-hero-ctas">
              <a className="hv-btn hv-btn-primary" href="/en#lead">
                Book a demo
              </a>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
