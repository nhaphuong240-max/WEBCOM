import Link from 'next/link';
import { SectionStackPlatform } from '../../../components/platform/SectionStackPlatform';
import { fetchPlatformPage, isPlatformCmsEnabled } from '../../../lib/platform-cms';

export const dynamic = 'force-dynamic';

export default async function ResourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { slug: resourceSlug } = await params;
  const sp = (await searchParams) || {};
  const slug = `resources/${resourceSlug}`;
  const page = await fetchPlatformPage(slug, { previewToken: sp.preview });
  const useCms =
    Boolean(page?.content_v1?.section_order?.length) &&
    (isPlatformCmsEnabled() || Boolean(sp.preview));

  if (useCms && page?.content_v1) {
    return (
      <main className="corp-page">
        <SectionStackPlatform content={page.content_v1} />
        <p style={{ marginTop: 24 }}>
          <Link href="/resources">← Tài nguyên</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Resource</div>
        <h1>{resourceSlug}</h1>
        <p>Tài liệu đang được cập nhật trên Platform CMS.</p>
        <Link href="/resources" className="corp-btn corp-btn-ghost">
          ← Danh sách
        </Link>
      </div>
    </main>
  );
}
