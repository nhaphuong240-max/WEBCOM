import Link from 'next/link';
import { SectionStackPlatform } from '../../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function IndustryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug: industry } = await params;
  const sp = (await searchParams) || {};
  const slug = `industries/${industry}`;
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
        <div className="corp-eyebrow">Industry</div>
        <h1>{industry}</h1>
        <p>Playbook theme theo ngành.</p>
        <Link
          href={`/templates?industry=${encodeURIComponent(industry)}`}
          className="corp-btn corp-btn-primary"
        >
          Xem templates
        </Link>
      </div>
    </main>
  );
}
