import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function validatePackage(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || 'creator-demo').trim();
  const name = String(formData.get('name') || 'Creator Demo').trim();
  const version = String(formData.get('version') || '0.1.0').trim();
  const headline = String(formData.get('headline') || 'Creator package headline').trim();
  const files = {
    'package.manifest.json': JSON.stringify({
      code,
      name,
      version,
      supports: ['hero', 'trust'],
      layouts: { home: ['hero', 'trust'] },
    }),
    'starter/home.json': JSON.stringify({
      schema_version: 1,
      section_order: ['hero', 'trust'],
      sections: {
        hero: {
          type: 'hero',
          id: 'sec_hero',
          props: { headline, eyebrow: name, cta: 'Mua ngay', cta_href: '/search' },
          style: {},
        },
        trust: {
          type: 'trust',
          id: 'sec_trust',
          props: { items: ['Creator stub', 'Validated'] },
          style: {},
        },
      },
    }),
    'starter/tokens.json': JSON.stringify({ accent: '#c45a6a', cream: '#faf6f4', ink: '#1a1214' }),
  };
  await apiJson('/v1/admin/creator/packages/validate', 'POST', { files });
  revalidatePath('/website/creator');
}

async function submitPackage(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || 'creator-demo').trim();
  const name = String(formData.get('name') || 'Creator Demo').trim();
  const version = String(formData.get('version') || '0.1.0').trim();
  const headline = String(formData.get('headline') || 'Creator package headline').trim();
  const files = {
    'package.manifest.json': JSON.stringify({
      code,
      name,
      version,
      supports: ['hero', 'trust'],
      layouts: { home: ['hero', 'trust'] },
    }),
    'starter/home.json': JSON.stringify({
      schema_version: 1,
      section_order: ['hero', 'trust'],
      sections: {
        hero: {
          type: 'hero',
          id: 'sec_hero',
          props: { headline, eyebrow: name, cta: 'Mua ngay', cta_href: '/search' },
          style: {},
        },
        trust: {
          type: 'trust',
          id: 'sec_trust',
          props: { items: ['Creator stub'] },
          style: {},
        },
      },
    }),
    'starter/tokens.json': JSON.stringify({ accent: '#c45a6a' }),
  };
  await apiJson('/v1/admin/creator/packages', 'POST', { files });
  revalidatePath('/website/creator');
}

export default async function CreatorPortalPage() {
  let submissions: Array<{
    id: string;
    code: string;
    name: string;
    version: string;
    status: string;
    created_at: string;
  }> = [];
  let error = '';
  try {
    submissions = await apiGet('/v1/admin/creator/packages');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Creator Portal"
        description="CMS-3 Could · validate ThemePackage (files map stub — zip binary sau)"
        actions={<Badge tone="accent">C3-5 stub</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Submit package">
        <form action={submitPackage} style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Code
            <input name="code" defaultValue="creator-demo" required />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Name
            <input name="name" defaultValue="Creator Demo" required />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Version
            <input name="version" defaultValue="0.1.0" required />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Hero headline
            <input name="headline" defaultValue="Serum từ Creator package" />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit">Validate &amp; submit</Button>
            <Button type="submit" variant="ghost" formAction={validatePackage}>
              Validate only
            </Button>
          </div>
        </form>
        <p style={{ fontSize: 12, color: '#6b5559', marginTop: 12 }}>
          Stub nhận <code>files</code> map (manifest + starter). Binary zip parsing chưa ship.
        </p>
      </Panel>

      <Panel title="Submissions">
        {submissions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có submission.</p>
        ) : (
          <ul style={{ fontSize: 13 }}>
            {submissions.map((s) => (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <strong>{s.code}</strong> v{s.version} — {s.name} ·{' '}
                <Badge tone={s.status === 'validated' ? 'accent' : 'muted'}>{s.status}</Badge>
                <span style={{ color: '#6b5559', marginLeft: 8 }}>{s.created_at}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
