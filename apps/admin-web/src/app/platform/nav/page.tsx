import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_PLATFORM_SITE_KEY || 'webcom_apex';
const PLATFORM_TENANT = process.env.NEXT_PUBLIC_PLATFORM_TENANT_ID || 'ten_platform';

async function platformHeaders() {
  const jar = await cookies();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-tenant-id': jar.get('ptt_tenant_id')?.value || PLATFORM_TENANT,
    'x-actor-id': jar.get('ptt_actor_id')?.value || 'usr_platform_approver',
  };
  const token = jar.get('ptt_access_token')?.value;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function platformJson<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const base =
    process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: await platformHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `API ${res.status}`);
  }
  return data as T;
}

type NavItem = { label: string; href: string };

function itemsToText(items: NavItem[]): string {
  return items.map((i) => `${i.label}|${i.href}`).join('\n');
}

function textToItems(raw: string): NavItem[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, href] = l.split('|').map((s) => s.trim());
      return { label: label || href || '', href: href || label || '/' };
    })
    .filter((i) => i.label && i.href);
}

export default async function PlatformNavPage() {
  let header: NavItem[] = [];
  let footer: NavItem[] = [];
  let err = '';
  try {
    const menus = await platformJson<Array<{ handle: string; items: NavItem[] }>>(
      `/v1/admin/platform/sites/${SITE}/nav`,
    );
    for (const m of menus) {
      if (m.handle === 'header') header = (m.items as NavItem[]) || [];
      if (m.handle === 'footer') footer = (m.items as NavItem[]) || [];
    }
  } catch (e) {
    err = e instanceof Error ? e.message : 'load failed';
  }

  async function saveHeader(formData: FormData) {
    'use server';
    const items = textToItems(String(formData.get('items') || ''));
    await platformJson(`/v1/admin/platform/sites/${SITE}/nav/header`, 'PUT', { items });
    revalidatePath('/platform/nav');
  }

  async function saveFooter(formData: FormData) {
    'use server';
    const items = textToItems(String(formData.get('items') || ''));
    await platformJson(`/v1/admin/platform/sites/${SITE}/nav/footer`, 'PUT', { items });
    revalidatePath('/platform/nav');
  }

  return (
    <div>
      <PageHeader
        title="Platform Navigation"
        description={`site_key=${SITE} · header / footer (CORP-CMS-2)`}
        actions={
          <>
            <Badge>nav</Badge>
            <Link href="/platform/pages">← Pages</Link>
          </>
        }
      />
      {err ? <Panel title="Lỗi">{err}</Panel> : null}
      <Panel title="Header">
        <form action={saveHeader}>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            Mỗi dòng: <code>Label|/path</code>
          </p>
          <textarea
            name="items"
            rows={8}
            defaultValue={itemsToText(header)}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
          />
          <Button type="submit" style={{ marginTop: 12 }}>
            Lưu header
          </Button>
        </form>
      </Panel>
      <Panel title="Footer">
        <form action={saveFooter}>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
            Mỗi dòng: <code>Label|/path</code>
          </p>
          <textarea
            name="items"
            rows={6}
            defaultValue={itemsToText(footer)}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
          />
          <Button type="submit" style={{ marginTop: 12 }}>
            Lưu footer
          </Button>
        </form>
      </Panel>
    </div>
  );
}
