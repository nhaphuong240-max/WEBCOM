/** Default Site Settings — Merchant CMS Pro (FR-001 / FR-011). */

export type SiteArchetype = 'commerce' | 'lead_gen' | 'booking' | 'content';

export type FloatingChannel = {
  key: string;
  visible: boolean;
  label: string;
  href: string;
  color1?: string;
  color2?: string;
};

export type SiteSettingsData = {
  schema_version: 1;
  archetype: SiteArchetype;
  identity: {
    logo_media_id: string | null;
    logo_url: string | null;
    favicon_media_id: string | null;
    favicon_url: string | null;
    og_image_media_id: string | null;
    og_image_url: string | null;
    logo_visible: boolean;
  };
  header: {
    bg: string;
    fg: string;
    cta_label: string;
    cta_href: string;
    show_account: boolean;
    show_cart: boolean;
  };
  floating_channels: FloatingChannel[];
  lead_popup: {
    enabled: boolean;
    delay_seconds: number;
    variant: string;
    title: string;
    cta_label: string;
    cta_href: string;
    suppress_paths: string[];
  };
  social_links: Array<{ network: string; url: string; visible: boolean }>;
  catalog_card: {
    image_ratio: string;
    show_price: boolean;
    show_vendor: boolean;
    show_rating: boolean;
    show_badge: boolean;
    primary_cta: 'add_to_cart' | 'view_detail' | 'quick_view';
  };
  privacy: {
    lead_consent_required: boolean;
    consent_label: string;
  };
  commerce: {
    show_mini_cart: boolean;
    show_cart_count: boolean;
    sticky_atc_mobile: boolean;
    quick_add_plp: boolean;
    free_shipping_threshold: number | null;
    min_order_amount: number | null;
    coupon_entry_cart: boolean;
    coupon_entry_checkout: boolean;
    empty_cart_title: string;
    empty_cart_cta_label: string;
    empty_cart_cta_href: string;
    cart_trust_badges: string[];
    checkout_policy_links: Array<{ label: string; href: string }>;
    guest_checkout_hint: string;
    sold_out_behavior: 'hide' | 'badge' | 'waitlist';
    show_compare_at_price: boolean;
    show_member_price_badge: boolean;
    announcement_bar: {
      enabled: boolean;
      text: string;
      href: string;
      start_at: string | null;
      end_at: string | null;
    };
    search_placeholder: string;
    plp_default_sort: string;
    plp_page_size: number;
    plp_filters_enabled: string[];
    pdp_tabs: string[];
    related_mode: string;
    related_limit: number;
    fbt_enabled: boolean;
    promo_popup: {
      enabled: boolean;
      title: string;
      code: string;
      delay_seconds: number;
    };
    analytics_surfaces: Record<string, boolean>;
  };
};

export function defaultSiteSettings(archetype: SiteArchetype = 'commerce'): SiteSettingsData {
  const lead = archetype === 'lead_gen' || archetype === 'booking';
  return {
    schema_version: 1,
    archetype,
    identity: {
      logo_media_id: null,
      logo_url: null,
      favicon_media_id: null,
      favicon_url: null,
      og_image_media_id: null,
      og_image_url: null,
      logo_visible: true,
    },
    header: {
      bg: '#ffffff',
      fg: '#0B2A4A',
      cta_label: lead ? 'Đăng ký tư vấn' : 'Mua ngay',
      cta_href: lead ? '/pages/dang-ky' : '/search',
      show_account: !lead,
      show_cart: !lead,
    },
    floating_channels: [
      {
        key: 'hotline',
        visible: true,
        label: 'Gọi tư vấn',
        href: 'tel:+84901234567',
        color1: '#1E5AA8',
        color2: '#0B2A4A',
      },
      {
        key: 'zalo',
        visible: true,
        label: 'Zalo',
        href: 'https://zalo.me/123456789',
        color1: '#0068FF',
        color2: '#0054cc',
      },
    ],
    lead_popup: {
      enabled: lead,
      delay_seconds: 12,
      variant: 'signup',
      title: 'Đăng ký nhận thông tin',
      cta_label: 'Nhận tư vấn',
      cta_href: '/pages/dang-ky',
      suppress_paths: ['/pages/thank-you', '/thank-you'],
    },
    social_links: [],
    catalog_card: {
      image_ratio: 'landscape',
      show_price: true,
      show_vendor: false,
      show_rating: false,
      show_badge: true,
      primary_cta: lead ? 'view_detail' : 'add_to_cart',
    },
    privacy: {
      lead_consent_required: true,
      consent_label: 'Tôi đồng ý xử lý dữ liệu cá nhân',
    },
    commerce: {
      show_mini_cart: !lead,
      show_cart_count: !lead,
      sticky_atc_mobile: !lead,
      quick_add_plp: false,
      free_shipping_threshold: 500000,
      min_order_amount: null,
      coupon_entry_cart: !lead,
      coupon_entry_checkout: !lead,
      empty_cart_title: lead ? 'Xem dự án / sản phẩm' : 'Giỏ hàng trống',
      empty_cart_cta_label: lead ? 'Xem danh mục' : 'Tiếp tục mua sắm',
      empty_cart_cta_href: '/',
      cart_trust_badges: ['COD toàn quốc', 'Đổi trả 7 ngày', 'Chính hãng'],
      checkout_policy_links: [
        { label: 'Điều khoản', href: '/p/terms' },
        { label: 'Vận chuyển', href: '/p/shipping' },
      ],
      guest_checkout_hint: 'Thanh toán không cần tài khoản',
      sold_out_behavior: 'badge',
      show_compare_at_price: true,
      show_member_price_badge: false,
      announcement_bar: {
        enabled: false,
        text: 'Freeship đơn từ 500k',
        href: '/search',
        start_at: null,
        end_at: null,
      },
      search_placeholder: 'Tìm sản phẩm…',
      plp_default_sort: 'newest',
      plp_page_size: 24,
      plp_filters_enabled: ['price', 'tag'],
      pdp_tabs: ['description', 'specs', 'shipping'],
      related_mode: 'same_collection',
      related_limit: 4,
      fbt_enabled: false,
      promo_popup: {
        enabled: false,
        title: 'Nhận mã giảm giá',
        code: 'WELCOME10',
        delay_seconds: 8,
      },
      analytics_surfaces: {
        view_item_list: true,
        select_item: true,
        view_item: true,
        add_to_cart: true,
        begin_checkout: true,
        purchase: true,
        view_promotion: true,
      },
    },
  };
}

export function mergeSiteSettings(
  partial: Partial<SiteSettingsData> | null | undefined,
  fallbackArchetype: SiteArchetype = 'commerce',
): SiteSettingsData {
  const base = defaultSiteSettings(
    (partial?.archetype as SiteArchetype) || fallbackArchetype,
  );
  if (!partial || typeof partial !== 'object') return base;
  return {
    ...base,
    ...partial,
    schema_version: 1,
    identity: { ...base.identity, ...(partial.identity || {}) },
    header: { ...base.header, ...(partial.header || {}) },
    lead_popup: { ...base.lead_popup, ...(partial.lead_popup || {}) },
    catalog_card: { ...base.catalog_card, ...(partial.catalog_card || {}) },
    privacy: { ...base.privacy, ...(partial.privacy || {}) },
    commerce: {
      ...base.commerce,
      ...(partial.commerce || {}),
      announcement_bar: {
        ...base.commerce.announcement_bar,
        ...(partial.commerce?.announcement_bar || {}),
      },
      promo_popup: {
        ...base.commerce.promo_popup,
        ...(partial.commerce?.promo_popup || {}),
      },
      analytics_surfaces: {
        ...base.commerce.analytics_surfaces,
        ...(partial.commerce?.analytics_surfaces || {}),
      },
    },
    floating_channels: partial.floating_channels ?? base.floating_channels,
    social_links: partial.social_links ?? base.social_links,
  };
}

/** Derived UX flags for storefront shell. */
export function commerceUxFromSettings(data: SiteSettingsData) {
  const lead = data.archetype === 'lead_gen' || data.archetype === 'content';
  const showCart = data.archetype === 'commerce' && data.header.show_cart;
  const bar = data.commerce.announcement_bar;
  const now = Date.now();
  const inWindow =
    bar.enabled &&
    (!bar.start_at || Date.parse(bar.start_at) <= now) &&
    (!bar.end_at || Date.parse(bar.end_at) >= now);
  return {
    show_cart: showCart,
    show_mini_cart: showCart && data.commerce.show_mini_cart,
    show_cart_count: showCart && data.commerce.show_cart_count,
    sticky_atc_mobile: showCart && data.commerce.sticky_atc_mobile,
    announcement: inWindow ? bar : null,
    empty_cart: {
      title: data.commerce.empty_cart_title,
      cta_label: data.commerce.empty_cart_cta_label,
      cta_href: data.commerce.empty_cart_cta_href,
    },
    header_cta: {
      label: data.header.cta_label,
      href: data.header.cta_href,
    },
    floating: data.floating_channels.filter((c) => c.visible && c.href),
    catalog_card: data.catalog_card,
    privacy: data.privacy,
    lead_popup: data.lead_popup,
    checkout_policy_links: data.commerce.checkout_policy_links,
    coupon_entry_cart: data.commerce.coupon_entry_cart,
    show_compare_at_price: data.commerce.show_compare_at_price,
    sold_out_behavior: data.commerce.sold_out_behavior,
    related_mode: data.commerce.related_mode,
    related_limit: data.commerce.related_limit,
    plp_default_sort: data.commerce.plp_default_sort,
    plp_filters_enabled: data.commerce.plp_filters_enabled,
    archetype: data.archetype,
    is_lead_gen: lead || data.archetype === 'lead_gen',
  };
}
