import Link from 'next/link';
import { SectionStackPlatform } from '../../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function CaseStudyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug: caseSlug } = await params;
  const sp = (await searchParams) || {};
  const slug = `case-studies/${caseSlug}`;
  const page = await fetchPlatformPage(slug, { previewToken: sp.preview });
  const useCms =
    Boolean(page?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  if (useCms && page?.content_v1) {
    return (
      <main className="corp-page">
        <SectionStackPlatform content={page.content_v1} />
        <p style={{ marginTop: 24 }}>
          <Link href="/case-studies">← Tất cả case studies</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Case</div>
        <h1>{caseSlug}</h1>
        <p>Case study đang được cập nhật.</p>
        <Link href="/case-studies" className="corp-btn corp-btn-ghost">
          ← Danh sách
        </Link>
      </div>
    </main>
  );
}
