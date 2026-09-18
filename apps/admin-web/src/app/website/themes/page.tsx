import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function promote(vid: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/theme-versions/${vid}/promote`, 'POST', {
    target: 'staging',
  });
  revalidatePath('/website/themes');
}

async function cloneVersion(vid: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/theme-versions/${vid}/clone`, 'POST', {});
  revalidatePath('/website/themes');
}

async function rollback() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/rollback`, 'POST', {});
  revalidatePath('/website/themes');
  revalidatePath('/website/golive');
}

export default async function ThemesPage() {
  let themes: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    package_version?: string | null;
    supports?: string[];
    versions: Array<{
      id: string;
      version: number;
      status: string;
      note: string;
      is_live?: boolean;
      previous_version_id?: string | null;
      created_at: string;
    }>;
  }> = [];
  let packages: Array<{ code: string; version: string; supports: string[] }> = [];
  let preview: { preview_path: string; token: string; expires_at: string } | null = null;
  let error = '';
  try {
    themes = await apiGet(`/v1/admin/storefronts/${SF}/themes`);
    packages = await apiGet('/v1/public/theme-packages');
    preview = await apiJson(`/v1/admin/storefronts/${SF}/preview-token`, 'POST', { hours: 24 });
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Theme Library"
        description="Draft / Staging / Published · package version · supports"
        actions={<Badge tone="accent">CMS-2 · mockup 05</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title={`Theme packages (${packages.length})`}>
        <ul style={{ fontSize: 13 }}>
          {packages.map((p) => (
            <li key={p.code}>
              <strong>{p.code}</strong> v{p.version} · supports: {(p.supports || []).join(', ')}
            </li>
          ))}
        </ul>
      </Panel>

      {preview ? (
        <Panel title="Staging preview token">
          <p style={{ fontSize: 13 }}>
            Path: <code>{preview.preview_path}</code> · hết hạn {preview.expires_at}
          </p>
        </Panel>
      ) : null}

      {themes.map((t) => (
        <Panel
          key={t.id}
          title={`${t.name} (${t.code}) · ${t.status}${t.package_version ? ` · pkg v${t.package_version}` : ''}`}
        >
          {t.supports?.length ? (
            <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0 }}>
              supports: {t.supports.join(', ')}
            </p>
          ) : null}
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>v</th>
                <th>status</th>
                <th>note</th>
                <th>actions</th>
              </tr>
            </thead>
            <tbody>
              {t.versions.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>
                    v{v.version} {v.is_live ? <Badge tone="accent">LIVE</Badge> : null}
                  </td>
                  <td>{v.status}</td>
                  <td>{v.note || '—'}</td>
                  <td style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
                    <form action={promote.bind(null, v.id)}>
                      <Button type="submit" variant="ghost">
                        → Staging
                      </Button>
                    </form>
                    <form action={cloneVersion.bind(null, v.id)}>
                      <Button type="submit" variant="ghost">
                        Clone
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ))}

      <Panel title="Rollback published">
        <form action={rollback}>
          <Button type="submit" variant="primary">
            Rollback về version trước
          </Button>
        </form>
      </Panel>
    </>
  );
}
