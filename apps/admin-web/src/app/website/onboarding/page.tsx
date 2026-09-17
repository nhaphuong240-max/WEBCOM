import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function saveBrandKit(formData: FormData) {
  'use server';
  const accent = String(formData.get('accent') || '#c45a6a');
  const ink = String(formData.get('ink') || '#1a1214');
  const title = String(formData.get('seo_title') || '');
  const description = String(formData.get('seo_description') || '');
  await apiJson(`/v1/admin/storefronts/${SF}/brand-kit`, 'PUT', {
    scope: 'storefront',
    publish: true,
    tokens: {
      colors: { accent, rose: accent, ink, cream: '#faf6f4', muted: '#6b5559' },
      fonts: { display: 'Syne', body: 'Be Vietnam Pro' },
      seo: { title, description },
      voice: { tone: 'warm_premium', cta_default: 'Mua ngay' },
      consent: { required_before_pixel: true },
      legal: { return_policy: 'Đổi trả 7 ngày' },
    },
  });
  await apiJson(`/v1/admin/storefronts/${SF}/brand-kit/apply`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'brand_kit',
    done: true,
  });
  revalidatePath('/website/onboarding');
}

async function advance(step: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', { step, done: true });
  revalidatePath('/website/onboarding');
}

export default async function OnboardingPage() {
  let onboarding: {
    current_step: string;
    completed: Record<string, boolean>;
    steps: Array<{ key: string; label: string; href: string }>;
  } | null = null;
  let brand: { tokens: { colors?: Record<string, string>; seo?: Record<string, string> } } | null =
    null;
  let error = '';
  try {
    onboarding = await apiGet(`/v1/admin/storefronts/${SF}/onboarding`);
    brand = await apiGet(`/v1/admin/storefronts/${SF}/brand-kit`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const colors = brand?.tokens?.colors || {};
  const seo = brand?.tokens?.seo || {};

  return (
    <>
      <PageHeader
        title="Website Onboarding"
        description="Brand Kit → Catalog → Theme Match → Payment → Go-live"
        actions={<Badge tone="accent">W3 · mockup 02</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Tiến độ">
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
          {(onboarding?.steps || []).map((s) => (
            <li key={s.key}>
              <strong>{s.label}</strong>{' '}
              {onboarding?.completed?.[s.key] ? (
                <Badge tone="signal">xong</Badge>
              ) : onboarding?.current_step === s.key ? (
                <Badge tone="accent">đang làm</Badge>
              ) : (
                <Badge>pending</Badge>
              )}{' '}
              · <a href={s.href}>{s.href}</a>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Bước 1 — Brand Kit">
        <form action={saveBrandKit} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          <label style={{ fontSize: 13 }}>
            Accent
            <input name="accent" defaultValue={colors.accent || '#c45a6a'} type="color" />
          </label>
          <label style={{ fontSize: 13 }}>
            Ink
            <input name="ink" defaultValue={colors.ink || '#1a1214'} type="color" />
          </label>
          <label style={{ fontSize: 13 }}>
            SEO title
            <input
              name="seo_title"
              defaultValue={seo.title || 'AURA Beauty'}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            SEO description
            <input
              name="seo_description"
              defaultValue={seo.description || ''}
              style={{ width: '100%', padding: 8 }}
            />
          </label>
          <Button type="submit" variant="primary">
            Lưu & apply Brand Kit
          </Button>
        </form>
      </Panel>

      <Panel title="Bỏ qua bước (deep link)">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={advance.bind(null, 'catalog')}>
            <Button type="submit" variant="ghost">
              Catalog done
            </Button>
          </form>
          <form action={advance.bind(null, 'theme_match')}>
            <Button type="submit" variant="ghost">
              Theme match done
            </Button>
          </form>
          <form action={advance.bind(null, 'payment')}>
            <Button type="submit" variant="ghost">
              Payment done
            </Button>
          </form>
        </div>
      </Panel>
    </>
  );
}
