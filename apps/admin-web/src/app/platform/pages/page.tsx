import Link from 'next/link';
import { PageHeader, Panel, Badge } from '@ptt/ui';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_PLATFORM_SITE_KEY || 'webcom_apex';
const PLATFORM_TENANT = process.env.NEXT_PUBLIC_PLATFORM_TENANT_ID || 'ten_platform';

async function platformGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const base =
    process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': jar.get('ptt_tenant_id')?.value || PLATFORM_TENANT,
    'x-actor-id': jar.get('ptt_actor_id')?.value || 'usr_platform_approver',
  };
  const token = jar.get('ptt_access_token')?.value;
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/api${path}`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export default async function PlatformPagesList() {
  let pages: Array<{
    slug: string;
    title: string;
    status: string;
    template_key: string;
  }> = [];
  let err = '';
  try {
    pages = await platformGet(`/v1/admin/platform/sites/${SITE}/pages`);
  } catch (e) {
    err = e instanceof Error ? e.message : 'load failed';
  }

  return (
    <div>
      <PageHeader
        title="Platform CMS"
        description={`site_key=${SITE} · CORP-CMS-1`}
        actions={<Badge>{pages.length} pages</Badge>}
      />
      {err ? <Panel title="Lỗi">{err}</Panel> : null}
      <Panel title="Pages">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th align="left">Slug</th>
              <th align="left">Title</th>
              <th align="left">Template</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug}>
                <td>
                  <code>{p.slug === 'home' ? '/' : `/${p.slug}`}</code>
                </td>
                <td>{p.title}</td>
                <td>{p.template_key}</td>
                <td>{p.status}</td>
                <td>
                  <Link href={`/platform/pages/${encodeURIComponent(p.slug)}`}>Sửa</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pages.length && !err ? <p>Chưa có page — chạy prisma seed.</p> : null}
      </Panel>
    </div>
  );
}
