import type { Metadata } from 'next';
import { GtmHome } from '../../components/GtmHome';
import { SectionStackPlatform } from '../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PTT — Omnichannel commerce run on real margin',
  description:
    'Website, Social, Live, POS and marketplaces on one OS. Measure contribution margin — not just GMV.',
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
    <main lang="en">
      {useCms && platformPage?.content_v1 ? (
        <SectionStackPlatform
          content={platformPage.content_v1}
          experimentCode={platformPage.experiment_code}
          experiment={platformPage.experiment}
          storefrontId={platformPage.interim_storefront_id}
        />
      ) : (
        <GtmHome locale="en" />
      )}
    </main>
  );
}
