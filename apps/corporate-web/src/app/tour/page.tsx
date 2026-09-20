import Link from 'next/link';
import { SectionStackPlatform } from '../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function TourPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = (await searchParams) || {};
  const page = await fetchPlatformPage('tour', { previewToken: sp.preview });
  const useCms =
    Boolean(page?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  if (useCms && page?.content_v1) {
    return (
      <main className="corp-page">
        <SectionStackPlatform content={page.content_v1} />
      </main>
    );
  }

  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Tour</div>
        <h1>Product tour</h1>
        <p>Theme → Brand Kit → Go-live → Live/POS → CRM.</p>
        <Link href="/templates" className="corp-btn corp-btn-primary">
          Xem templates
        </Link>
      </div>
    </main>
  );
}
