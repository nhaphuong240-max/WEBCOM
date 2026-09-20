import Link from 'next/link';
import { SectionStackPlatform } from '../../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function SolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { module } = await params;
  const sp = (await searchParams) || {};
  const slug = `solutions/${module}`;
  const page = await fetchPlatformPage(slug, { previewToken: sp.preview });
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
        <div className="corp-eyebrow">Solution</div>
        <h1>{module === 'website' ? 'Website Commerce' : module}</h1>
        <p>Theme marketplace · Brand Kit · Go-live gate.</p>
        <Link href="/templates?goal=conversion" className="corp-btn corp-btn-primary">
          Xem templates
        </Link>
      </div>
    </main>
  );
}
