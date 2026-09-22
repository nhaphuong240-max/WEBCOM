import { PageHeader, Panel, Badge, Button, Input } from '@ptt/ui';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { apiGet, apiJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';
const DEMO_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/$/, '') ||
  process.env.DEMO_PUBLIC_URL?.replace(/\/$/, '') ||
  'https://themes.ngoinhahomnay.vn';

type PageRow = {
  slug: string;
  title: string;
  status: string;
  template_key?: string;
  versions?: Array<{ version: number; status: string }>;
};

type Draft = {
  version?: number;
  status?: string;
  title?: string;
  content_v1?: {
    section_order?: string[];
    sections?: Record<string, { type?: string; props?: Record<string, unknown> }>;
  };
  seo?: Record<string, unknown>;
};

function readCampaign(draft: Draft | null) {
  const sections = draft?.content_v1?.sections || {};
  const byType = (t: string) => Object.values(sections).find((s) => s.type === t)?.props || {};
  const hero = byType('hero');
  const countdown = byType('countdown');
  const coupon = byType('coupon_strip');
  const faq = byType('faq');
  const seo = draft?.seo || {};
  const faqItems = Array.isArray(faq.items)
    ? (faq.items as Array<{ q?: string; a?: string }>)
        .map((i) => `${i.q || ''}|${i.a || ''}`)
        .join('\n')
    : '';
  return {
    headline: String(hero.headline || draft?.title || ''),
    cta: String(hero.cta || 'Mua ngay'),
    cta_href: String(hero.cta_href || '/search'),
    countdown_title: String(countdown.title || 'Ưu đãi kết thúc sau'),
    ends_at: String(countdown.ends_at || ''),
    coupon_code: String(coupon.code || 'FLASH10'),
    coupon_title: String(coupon.title || 'Mã giảm giá'),
    coupon_hint: String(coupon.hint || ''),
    faq_lines: faqItems,
    schedule_start: String(seo.schedule_start || ''),
    schedule_end: String(seo.schedule_end || ''),
    utm_campaign: String(seo.utm_campaign || ''),
    seo_title: String(seo.title || ''),
    seo_description: String(seo.description || ''),
    version: draft?.version || 0,
    status: draft?.status || 'draft',
  };
}

async function createCampaign(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^\/+|\/+$/g, '');
  const title = String(formData.get('title') || slug);
  if (!slug) return;
  await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
    slug,
    title,
    template_key: 'landing_promo',
  });
  revalidatePath('/website/campaigns');
}

async function saveCampaign(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug') || '').trim();
  if (!slug) return;
  const publish = formData.get('publish') === '1';
  const cloneTo = String(formData.get('clone_to') || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  const headline = String(formData.get('headline') || 'Flash sale');
  const cta = String(formData.get('cta') || 'Mua ngay');
  let ctaHref = String(formData.get('cta_href') || '/search');
  const utm = String(formData.get('utm_campaign') || '').trim();
  if (utm && !ctaHref.includes('utm_')) {
    const join = ctaHref.includes('?') ? '&' : '?';
    ctaHref = `${ctaHref}${join}utm_campaign=${encodeURIComponent(utm)}&utm_medium=promo`;
  }
  const endsAt = String(formData.get('ends_at') || '');
  const countdownTitle = String(formData.get('countdown_title') || 'Ưu đãi kết thúc sau');
  const couponCode = String(formData.get('coupon_code') || 'FLASH10');
  const couponTitle = String(formData.get('coupon_title') || 'Mã giảm giá');
  const couponHint = String(formData.get('coupon_hint') || '');
  const faqLines = String(formData.get('faq_lines') || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [q, a] = l.split('|').map((s) => s.trim());
      return { q: q || 'Câu hỏi?', a: a || '' };
    });
  const scheduleStart = String(formData.get('schedule_start') || '') || null;
  const scheduleEnd = String(formData.get('schedule_end') || '') || null;
  const seoTitle = String(formData.get('seo_title') || headline);
  const seoDescription = String(formData.get('seo_description') || '');

  const targetSlug = cloneTo || slug;
  if (cloneTo && cloneTo !== slug) {
    try {
      await apiJson(`/v1/admin/storefronts/${SF}/pages`, 'POST', {
        slug: cloneTo,
        title: `${headline} (copy)`,
        template_key: 'landing_promo',
      });
    } catch {
      /* may exist */
    }
  }

  const draft = await apiGet<Draft>(
    `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(targetSlug)}`,
  ).catch(() => ({ version: 0 } as Draft));

  await apiJson(`/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(targetSlug)}`, 'PUT', {
    expected_version: draft.version || undefined,
    create_if_missing: true,
    template_key: 'landing_promo',
    title: headline,
    content: {
      schema_version: 1,
      section_order: ['hero', 'countdown', 'coupon_strip', 'product_grid', 'faq'],
      sections: {
        hero: {
          type: 'hero',
          id: 'sec_hero',
          props: { eyebrow: 'Campaign', headline, cta, cta_href: ctaHref },
          style: {},
        },
        countdown: {
          type: 'countdown',
          id: 'sec_countdown',
          props: {
            title: countdownTitle,
            label: 'Còn lại',
            ends_at: endsAt,
            hide_when_ended: true,
            href: ctaHref,
          },
          style: {},
        },
        coupon_strip: {
          type: 'coupon_strip',
          id: 'sec_coupon',
          props: {
            code: couponCode,
            title: couponTitle,
            hint: couponHint,
            cta_label: 'Đến checkout',
            cta_href: '/checkout',
            ends_at: endsAt || null,
          },
          style: {},
        },
        product_grid: {
          type: 'product_grid',
          id: 'sec_grid',
          props: { limit: 8, sort: 'newest' },
          style: {},
        },
        faq: {
          type: 'faq',
          id: 'sec_faq',
          props: {
            items: faqLines.length
              ? faqLines
              : [{ q: 'Mã dùng đến khi nào?', a: 'Đến khi countdown kết thúc.' }],
          },
          style: {},
        },
      },
    },
    seo: {
      title: seoTitle,
      description: seoDescription,
      schedule_start: scheduleStart,
      schedule_end: scheduleEnd,
      utm_campaign: utm || targetSlug,
    },
  });

  if (publish) {
    await apiJson(
      `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(targetSlug)}/promote`,
      'POST',
      { target: 'published' },
    );
  }

  revalidatePath('/website/campaigns');
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const editSlug = (sp.slug || '').trim();

  let pages: PageRow[] = [];
  let error = '';
  try {
    pages = await apiGet(`/v1/admin/storefronts/${SF}/pages`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const campaigns = pages.filter((p) => p.template_key === 'landing_promo');

  let edit: (ReturnType<typeof readCampaign> & { slug: string }) | null = null;
  if (editSlug) {
    const draft = await apiGet<Draft>(
      `/v1/admin/storefronts/${SF}/pages/${encodeURIComponent(editSlug)}`,
    ).catch(() => null);
    edit = { slug: editSlug, ...readCampaign(draft) };
  }

  return (
    <>
      <PageHeader
        title="Campaign · Promo landing"
        description="landing_promo · countdown TZ VN · coupon · product grid · FAQ (FR-016)"
        actions={<Badge tone="accent">PRO-C2 · PC2-7</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Danh sách campaign">
        {campaigns.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ptt-muted)' }}>Chưa có landing_promo.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
            {campaigns.map((p) => {
              const published = p.versions?.some((v) => v.status === 'published');
              return (
                <li
                  key={p.slug}
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--ptt-line)',
                  }}
                >
                  <strong>{p.title}</strong>
                  <code>/{p.slug}</code>
                  <Badge tone={published ? 'signal' : 'muted'}>
                    {published ? 'published' : p.status}
                  </Badge>
                  <Link href={`/website/campaigns?slug=${encodeURIComponent(p.slug)}`}>Sửa</Link>
                  <a href={`${DEMO_URL}/promo/${p.slug}`} target="_blank" rel="noreferrer">
                    SF
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Tạo campaign mới">
        <form action={createCampaign} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input name="slug" placeholder="slug (vd. flash-9-9)" required style={{ maxWidth: 220 }} />
          <Input name="title" placeholder="Tiêu đề" style={{ maxWidth: 220 }} />
          <Button type="submit" variant="primary">
            Tạo landing_promo
          </Button>
        </form>
      </Panel>

      {edit ? (
        <Panel title={`Sửa · ${edit.slug}`}>
          <form action={saveCampaign} style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
            <input type="hidden" name="slug" value={edit.slug} />
            <Input name="headline" placeholder="Headline" defaultValue={edit.headline} />
            <Input name="cta" placeholder="CTA label" defaultValue={edit.cta} />
            <Input name="cta_href" placeholder="CTA href" defaultValue={edit.cta_href} />
            <Input
              name="countdown_title"
              placeholder="Countdown title"
              defaultValue={edit.countdown_title}
            />
            <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
              ends_at (ISO hoặc YYYY-MM-DDTHH:mm — giờ VN +07)
              <Input name="ends_at" defaultValue={edit.ends_at} placeholder="2026-09-30T23:59" />
            </label>
            <Input name="coupon_code" placeholder="Coupon code" defaultValue={edit.coupon_code} />
            <Input name="coupon_title" defaultValue={edit.coupon_title} />
            <Input name="coupon_hint" defaultValue={edit.coupon_hint} placeholder="Hint" />
            <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
              FAQ (mỗi dòng: câu hỏi|trả lời)
              <textarea
                name="faq_lines"
                rows={4}
                defaultValue={edit.faq_lines}
                style={{ padding: 8, borderRadius: 8, border: '1px solid var(--ptt-line)' }}
              />
            </label>
            <hr style={{ border: 0, borderTop: '1px solid var(--ptt-line)' }} />
            <strong style={{ fontSize: 13 }}>Schedule &amp; UTM</strong>
            <Input
              name="schedule_start"
              placeholder="schedule_start ISO (optional)"
              defaultValue={edit.schedule_start}
            />
            <Input
              name="schedule_end"
              placeholder="schedule_end ISO (optional)"
              defaultValue={edit.schedule_end}
            />
            <Input name="utm_campaign" placeholder="utm_campaign" defaultValue={edit.utm_campaign} />
            <Input name="seo_title" placeholder="SEO title" defaultValue={edit.seo_title} />
            <Input
              name="seo_description"
              placeholder="SEO description"
              defaultValue={edit.seo_description}
            />
            <Input name="clone_to" placeholder="Clone sang slug mới (optional)" />
            <p style={{ fontSize: 12, color: 'var(--ptt-muted)', margin: 0 }}>
              Draft v{edit.version} · {edit.status}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit" variant="ghost" name="publish" value="0">
                Lưu draft
              </Button>
              <button
                type="submit"
                name="publish"
                value="1"
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--ptt-accent)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Lưu &amp; Publish
              </button>
              <Link href="/website/campaigns" style={{ alignSelf: 'center', fontSize: 13 }}>
                Đóng
              </Link>
            </div>
          </form>
        </Panel>
      ) : null}
    </>
  );
}
