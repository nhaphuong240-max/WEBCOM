import { Button, Input, PageHeader, Panel, Badge } from '@ptt/ui';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { apiGet, apiJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

type SiteSettingsPayload = {
  version: number;
  data: Record<string, unknown>;
  commerce_ux?: Record<string, unknown>;
};

async function saveSettings(formData: FormData) {
  'use server';
  const version = Number(formData.get('expected_version') || 0);
  const tab = String(formData.get('tab') || 'general');
  const current = await apiGet<SiteSettingsPayload>(`/v1/admin/storefronts/${SF}/site-settings`);
  const data = { ...(current.data || {}) } as Record<string, unknown>;

  if (tab === 'general') {
    data.archetype = String(formData.get('archetype') || 'commerce');
    data.header = {
      ...((data.header as object) || {}),
      cta_label: String(formData.get('cta_label') || ''),
      cta_href: String(formData.get('cta_href') || ''),
      show_cart: formData.get('show_cart') === 'on',
      show_account: formData.get('show_account') === 'on',
      bg: String(formData.get('header_bg') || '#ffffff'),
      fg: String(formData.get('header_fg') || '#0B2A4A'),
    };
    data.identity = {
      ...((data.identity as object) || {}),
      logo_url: String(formData.get('logo_url') || '') || null,
      favicon_url: String(formData.get('favicon_url') || '') || null,
      og_image_url: String(formData.get('og_image_url') || '') || null,
      logo_visible: formData.get('logo_visible') === 'on',
    };
    data.privacy = {
      ...((data.privacy as object) || {}),
      lead_consent_required: formData.get('lead_consent_required') === 'on',
      consent_label: String(formData.get('consent_label') || ''),
    };
  }

  if (tab === 'floating') {
    data.floating_channels = [
      {
        key: 'hotline',
        visible: formData.get('hotline_visible') === 'on',
        label: String(formData.get('hotline_label') || 'Hotline'),
        href: String(formData.get('hotline_href') || ''),
      },
      {
        key: 'zalo',
        visible: formData.get('zalo_visible') === 'on',
        label: String(formData.get('zalo_label') || 'Zalo'),
        href: String(formData.get('zalo_href') || ''),
      },
    ];
  }

  if (tab === 'commerce') {
    data.commerce = {
      ...((data.commerce as object) || {}),
      show_mini_cart: formData.get('show_mini_cart') === 'on',
      show_cart_count: formData.get('show_cart_count') === 'on',
      sticky_atc_mobile: formData.get('sticky_atc_mobile') === 'on',
      coupon_entry_cart: formData.get('coupon_entry_cart') === 'on',
      coupon_entry_checkout: formData.get('coupon_entry_checkout') === 'on',
      show_compare_at_price: formData.get('show_compare_at_price') === 'on',
      empty_cart_title: String(formData.get('empty_cart_title') || ''),
      empty_cart_cta_label: String(formData.get('empty_cart_cta_label') || ''),
      empty_cart_cta_href: String(formData.get('empty_cart_cta_href') || '/'),
      plp_default_sort: String(formData.get('plp_default_sort') || 'newest'),
      announcement_bar: {
        enabled: formData.get('announce_enabled') === 'on',
        text: String(formData.get('announce_text') || ''),
        href: String(formData.get('announce_href') || ''),
        start_at: String(formData.get('announce_start') || '') || null,
        end_at: String(formData.get('announce_end') || '') || null,
      },
    };
    data.catalog_card = {
      ...((data.catalog_card as object) || {}),
      primary_cta: String(formData.get('primary_cta') || 'add_to_cart'),
      show_price: formData.get('show_price') === 'on',
    };
  }

  if (tab === 'popup') {
    data.lead_popup = {
      ...((data.lead_popup as object) || {}),
      enabled: formData.get('popup_enabled') === 'on',
      delay_seconds: Number(formData.get('popup_delay') || 12),
      title: String(formData.get('popup_title') || ''),
      cta_label: String(formData.get('popup_cta') || ''),
      cta_href: String(formData.get('popup_href') || '/pages/dang-ky'),
    };
  }

  await apiJson(`/v1/admin/storefronts/${SF}/site-settings`, 'PUT', {
    expected_version: version || undefined,
    data,
  });
  revalidatePath('/website/settings');
}

export default async function WebsiteSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const tab = sp.tab || 'general';
  let settings: SiteSettingsPayload | null = null;
  let error = '';
  try {
    settings = await apiGet<SiteSettingsPayload>(`/v1/admin/storefronts/${SF}/site-settings`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const d = (settings?.data || {}) as Record<string, any>;
  const header = d.header || {};
  const identity = d.identity || {};
  const privacy = d.privacy || {};
  const commerce = d.commerce || {};
  const announce = commerce.announcement_bar || {};
  const floating = (d.floating_channels || []) as Array<Record<string, any>>;
  const hotline = floating.find((c) => c.key === 'hotline') || {};
  const zalo = floating.find((c) => c.key === 'zalo') || {};
  const popup = d.lead_popup || {};
  const card = d.catalog_card || {};

  const tabs = [
    { id: 'general', label: 'Chung' },
    { id: 'floating', label: 'Liên hệ nổi' },
    { id: 'commerce', label: 'Bán hàng' },
    { id: 'popup', label: 'Popup' },
  ];

  return (
    <>
      <PageHeader
        title="Thiết lập website"
        description="CMS Pro · cấu hình chung cho mọi template (merchant)"
        actions={<Badge tone="accent">FR-001 · 011</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/website/settings?tab=${t.id}`}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--ptt-line)',
              background: tab === t.id ? 'var(--ptt-accent)' : 'transparent',
              color: tab === t.id ? '#fff' : 'inherit',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/website/builder" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ptt-accent)' }}>
          → Site Builder
        </Link>
        <Link href="/website/leads" style={{ fontSize: 13, color: 'var(--ptt-accent)' }}>
          → Leads
        </Link>
      </div>

      <Panel title={`Tab · ${tabs.find((t) => t.id === tab)?.label || tab}`}>
        <form action={saveSettings} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="expected_version" value={settings?.version || 0} />

          {tab === 'general' ? (
            <>
              <label style={{ fontSize: 13 }}>
                Archetype
                <select name="archetype" defaultValue={d.archetype || 'commerce'} style={{ display: 'block', width: '100%', height: 36, marginTop: 4 }}>
                  <option value="commerce">commerce — bán hàng</option>
                  <option value="lead_gen">lead_gen — thu lead</option>
                  <option value="booking">booking — đặt lịch</option>
                  <option value="content">content — nội dung</option>
                </select>
              </label>
              <Input name="logo_url" placeholder="Logo URL" defaultValue={identity.logo_url || ''} />
              <Input name="favicon_url" placeholder="Favicon URL" defaultValue={identity.favicon_url || ''} />
              <Input name="og_image_url" placeholder="OG image URL" defaultValue={identity.og_image_url || ''} />
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="logo_visible" defaultChecked={identity.logo_visible !== false} /> Hiện logo
              </label>
              <Input name="cta_label" placeholder="Header CTA" defaultValue={header.cta_label || ''} />
              <Input name="cta_href" placeholder="CTA href" defaultValue={header.cta_href || ''} />
              <Input name="header_bg" placeholder="Header bg" defaultValue={header.bg || '#ffffff'} />
              <Input name="header_fg" placeholder="Header fg" defaultValue={header.fg || '#0B2A4A'} />
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_cart" defaultChecked={!!header.show_cart} /> Hiện giỏ hàng
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_account" defaultChecked={!!header.show_account} /> Hiện tài khoản
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="lead_consent_required" defaultChecked={privacy.lead_consent_required !== false} /> Bắt buộc consent form
              </label>
              <Input name="consent_label" placeholder="Consent label" defaultValue={privacy.consent_label || ''} />
            </>
          ) : null}

          {tab === 'floating' ? (
            <>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="hotline_visible" defaultChecked={hotline.visible !== false} /> Hotline
              </label>
              <Input name="hotline_label" defaultValue={hotline.label || 'Gọi tư vấn'} />
              <Input name="hotline_href" defaultValue={hotline.href || 'tel:+84901234567'} />
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="zalo_visible" defaultChecked={zalo.visible !== false} /> Zalo
              </label>
              <Input name="zalo_label" defaultValue={zalo.label || 'Zalo'} />
              <Input name="zalo_href" defaultValue={zalo.href || ''} />
            </>
          ) : null}

          {tab === 'commerce' ? (
            <>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_mini_cart" defaultChecked={commerce.show_mini_cart !== false} /> Mini-cart
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_cart_count" defaultChecked={commerce.show_cart_count !== false} /> Badge số lượng
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="sticky_atc_mobile" defaultChecked={!!commerce.sticky_atc_mobile} /> Sticky ATC mobile
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="coupon_entry_cart" defaultChecked={!!commerce.coupon_entry_cart} /> Ô coupon cart
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="coupon_entry_checkout" defaultChecked={!!commerce.coupon_entry_checkout} /> Ô coupon checkout
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_compare_at_price" defaultChecked={commerce.show_compare_at_price !== false} /> Giá gạch
              </label>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="show_price" defaultChecked={card.show_price !== false} /> Hiện giá trên card
              </label>
              <label style={{ fontSize: 13 }}>
                CTA card
                <select name="primary_cta" defaultValue={card.primary_cta || 'add_to_cart'} style={{ display: 'block', width: '100%', height: 36, marginTop: 4 }}>
                  <option value="add_to_cart">add_to_cart</option>
                  <option value="view_detail">view_detail</option>
                  <option value="quick_view">quick_view</option>
                </select>
              </label>
              <Input name="empty_cart_title" placeholder="Empty cart title" defaultValue={commerce.empty_cart_title || ''} />
              <Input name="empty_cart_cta_label" placeholder="Empty CTA label" defaultValue={commerce.empty_cart_cta_label || ''} />
              <Input name="empty_cart_cta_href" placeholder="Empty CTA href" defaultValue={commerce.empty_cart_cta_href || '/'} />
              <label style={{ fontSize: 13 }}>
                PLP sort mặc định
                <select name="plp_default_sort" defaultValue={commerce.plp_default_sort || 'newest'} style={{ display: 'block', width: '100%', height: 36, marginTop: 4 }}>
                  <option value="newest">newest</option>
                  <option value="price_asc">price_asc</option>
                  <option value="price_desc">price_desc</option>
                  <option value="bestseller">bestseller</option>
                </select>
              </label>
              <hr style={{ border: 0, borderTop: '1px solid var(--ptt-line)' }} />
              <strong style={{ fontSize: 13 }}>Announcement bar</strong>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="announce_enabled" defaultChecked={!!announce.enabled} /> Bật
              </label>
              <Input name="announce_text" defaultValue={announce.text || ''} placeholder="Text" />
              <Input name="announce_href" defaultValue={announce.href || ''} placeholder="Href" />
              <Input name="announce_start" defaultValue={announce.start_at || ''} placeholder="start ISO" />
              <Input name="announce_end" defaultValue={announce.end_at || ''} placeholder="end ISO" />
            </>
          ) : null}

          {tab === 'popup' ? (
            <>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" name="popup_enabled" defaultChecked={!!popup.enabled} /> Bật lead popup
              </label>
              <Input name="popup_delay" type="number" defaultValue={popup.delay_seconds ?? 12} />
              <Input name="popup_title" defaultValue={popup.title || ''} />
              <Input name="popup_cta" defaultValue={popup.cta_label || ''} />
              <Input name="popup_href" defaultValue={popup.cta_href || '/pages/dang-ky'} />
            </>
          ) : null}

          <Button type="submit" variant="primary">
            Lưu (v{settings?.version ?? 0})
          </Button>
        </form>
      </Panel>
    </>
  );
}
