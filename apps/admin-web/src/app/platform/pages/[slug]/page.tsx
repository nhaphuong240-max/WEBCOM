import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { BuilderCanvas, type ContentV1 } from '../../../website/builder/builder-canvas';
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

export default async function PlatformPageEditor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let draft: {
    title?: string;
    version?: number;
    status?: string;
    content_v1?: ContentV1;
    seo?: { title?: string; description?: string };
  } | null = null;
  let sections: Array<{ key: string; label: string; fields: string[] }> = [];
  let loadErr = '';

  try {
    const [d, lib] = await Promise.all([
      platformJson<{
        title?: string;
        version?: number;
        status?: string;
        content_v1?: ContentV1;
        seo?: { title?: string; description?: string };
      }>(`/v1/admin/platform/sites/${SITE}/pages/${encodeURIComponent(slug)}`),
      platformJson<{ sections: Array<{ key: string; label: string; fields: string[] }> }>(
        `/v1/admin/builder/sections?scope=platform`,
      ),
    ]);
    draft = d;
    sections = lib.sections || [];
  } catch (e) {
    loadErr = e instanceof Error ? e.message : 'load failed';
  }

  async function saveCanvasAction(payload: {
    content: ContentV1;
    seo: { title?: string; description?: string };
    expected_version: number;
  }) {
    'use server';
    try {
      const res = await platformJson<{ version: number }>(
        `/v1/admin/platform/sites/${SITE}/pages/${encodeURIComponent(slug)}`,
        'PUT',
        {
          expected_version: payload.expected_version || undefined,
          content: payload.content,
          seo: payload.seo,
        },
      );
      revalidatePath(`/platform/pages/${slug}`);
      return { ok: true as const, version: res.version };
    } catch (e) {
      return {
        ok: false as const,
        version: payload.expected_version,
        error: e instanceof Error ? e.message : 'save failed',
      };
    }
  }

  async function transitionAction(formData: FormData) {
    'use server';
    const target = String(formData.get('target') || 'published');
    const checklist = {
      seo_ok: formData.get('seo_ok') === 'on',
      cta_codes_ok: formData.get('cta_codes_ok') === 'on',
      legal_ok: formData.get('legal_ok') === 'on',
    };
    await platformJson(
      `/v1/admin/platform/sites/${SITE}/pages/${encodeURIComponent(slug)}/transition`,
      'POST',
      { target, checklist: target === 'published' ? checklist : undefined },
    );
    revalidatePath(`/platform/pages/${slug}`);
    revalidatePath('/platform/pages');
  }

  const content: ContentV1 = draft?.content_v1 || {
    schema_version: 1,
    section_order: [],
    sections: {},
  };

  return (
    <div>
      <PageHeader
        title={draft?.title || slug}
        description={`Platform · ${slug} · ${draft?.status || '—'}`}
        actions={
          <>
            <Badge>{draft?.status || 'n/a'}</Badge>
            <Link href="/platform/pages">← Danh sách</Link>
          </>
        }
      />
      {loadErr ? <Panel title="Lỗi">{loadErr}</Panel> : null}

      <Panel title="Publish checklist (Approver)">
        <form action={transitionAction} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label>
            <input type="checkbox" name="seo_ok" /> SEO OK
          </label>
          <label>
            <input type="checkbox" name="cta_codes_ok" /> CTA codes OK
          </label>
          <label>
            <input type="checkbox" name="legal_ok" /> Legal OK
          </label>
          <Button type="submit" name="target" value="review">
            Gửi review
          </Button>
          <Button type="submit" name="target" value="published">
            Publish
          </Button>
          <Button type="submit" name="target" value="draft">
            Về draft
          </Button>
        </form>
      </Panel>

      {!loadErr ? (
        <BuilderCanvas
          initialContent={content}
          initialVersion={draft?.version || 1}
          initialSeo={draft?.seo || {}}
          sections={sections}
          supports={sections.map((s) => s.key)}
          media={[]}
          headerNav={[]}
          savedBlocks={[]}
          saveAction={saveCanvasAction}
          createMediaAction={async () => ({ id: '', url: '', alt: '' })}
          saveNavAction={async () => []}
          saveBlockAction={async () => ({
            id: '',
            name: '',
            section_type: '',
            content: { type: '', id: '', props: {}, style: {} },
          })}
          suggestCopyAction={async () => ({ variants: [], draft_only: true })}
        />
      ) : null}
    </div>
  );
}
