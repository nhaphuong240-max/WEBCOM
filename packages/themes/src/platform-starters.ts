import type { ContentV1 } from './types';

/** Page starters for Platform CMS builder (Spec §9.3). */
export const PLATFORM_STARTERS: Record<string, { title: string; content: ContentV1 }> = {
  gtm_home: {
    title: 'Homepage GTM',
    content: {
      schema_version: 1,
      section_order: ['announce', 'hero', 'proof', 'modules', 'cta'],
      sections: {
        announce: {
          type: 'announce_bar',
          id: 'sec_announce',
          props: {
            text: 'Trial self-serve — không cần thẻ tín dụng',
            cta_label: 'Bắt đầu',
            href: '/trial',
            cta_code: 'cta_trial',
            tone: 'promo',
            ends_at: null,
          },
          style: {},
        },
        hero: {
          type: 'platform_hero',
          id: 'sec_hero',
          props: {
            headline: 'Website Commerce cho bán lẻ Việt Nam',
            sub: 'Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS',
            primary_cta: {
              label: 'Xem templates',
              href: '/templates',
              cta_code: 'cta_templates',
            },
            secondary_cta: {
              label: 'Đặt demo',
              href: '/#lead',
              cta_code: 'cta_book_demo',
            },
            search_enabled: true,
          },
          style: {},
        },
        proof: {
          type: 'social_proof',
          id: 'sec_proof',
          props: {
            items: [
              { n: '30+', label: 'Theme playbooks' },
              { n: '1', label: 'Shared CMS engine' },
              { n: 'VN', label: 'Checkout & logistics' },
            ],
          },
          style: {},
        },
        modules: {
          type: 'module_grid',
          id: 'sec_modules',
          props: {
            items: [
              {
                title: 'Website Commerce',
                body: 'Theme HTML/Next · Brand Kit · Go-live',
                href: '/templates?goal=conversion',
                icon: 'cart',
              },
              {
                title: 'Live & Social',
                body: 'Live drop, keyword order, attribution',
                href: '/templates?goal=live',
                icon: 'live',
              },
              {
                title: 'Omnichannel POS',
                body: 'Giá · tồn · khách web ↔ quầy',
                href: '/templates?goal=omnichannel',
                icon: 'pos',
              },
            ],
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_cta',
          props: {
            headline: 'Sẵn sàng dùng thử?',
            body: 'Trial self-serve hoặc đặt demo với sales.',
            cta: { label: 'Bắt đầu trial', href: '/trial', cta_code: 'cta_trial' },
          },
          style: {},
        },
      },
    },
  },
  gtm_pricing: {
    title: 'Pricing',
    content: {
      schema_version: 1,
      section_order: ['hero', 'pricing', 'faq', 'cta'],
      sections: {
        hero: {
          type: 'platform_hero',
          id: 'sec_pricing_hero',
          props: {
            headline: 'Gói phù hợp từng giai đoạn',
            sub: 'Tách Theme license (one-time) và Platform plan. Trial trước — nâng cấp khi cần.',
            primary_cta: {
              label: 'Đặt demo',
              href: '/#lead',
              cta_code: 'cta_book_demo',
            },
            search_enabled: false,
          },
          style: {},
        },
        pricing: {
          type: 'pricing_table',
          id: 'sec_pricing',
          props: {
            theme_note:
              'Theme license (one_time) thanh toán VietQR riêng trên Template Marketplace — không gộp vào Platform plan.',
            plans: [
              {
                name: 'Theme license',
                price: 'One-time',
                layer: 'theme',
                featured: false,
                features: [
                  'Mua theme trên marketplace',
                  'Install vào storefront',
                  'Cập nhật package theo license',
                ],
                cta: {
                  label: 'Xem templates',
                  href: '/templates',
                  cta_code: 'cta_templates',
                },
              },
              {
                name: 'Platform Growth',
                price: 'Liên hệ',
                layer: 'platform',
                featured: true,
                features: [
                  'Analytics & experiments',
                  'CRM / RFM / loyalty',
                  'Agency preview',
                ],
                cta: {
                  label: 'Đặt demo',
                  href: '/#lead',
                  cta_code: 'cta_book_demo',
                },
              },
              {
                name: 'Platform Enterprise',
                price: 'Liên hệ',
                layer: 'platform',
                featured: false,
                features: ['Headless API', 'SLA 99.9%', 'Dedicated success'],
                cta: {
                  label: 'Liên hệ Sales',
                  href: '/#lead',
                  cta_code: 'cta_book_demo',
                },
              },
            ],
          },
          style: {},
        },
        faq: {
          type: 'faq',
          id: 'sec_faq',
          props: {
            items: [
              {
                q: 'Theme và Platform có tách không?',
                a: 'Có — theme one-time mua trên marketplace; platform plan là gói vận hành (analytics, SLA…).',
              },
              {
                q: 'Có trial không?',
                a: 'Có trial self-serve trước khi mua theme / nâng cấp platform.',
              },
            ],
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_pricing_cta',
          props: {
            headline: 'Cần báo giá Platform?',
            body: 'Sales phản hồi trong giờ làm việc (SLA first-touch 4h).',
            cta: { label: 'Đặt demo', href: '/#lead', cta_code: 'cta_book_demo' },
          },
          style: {},
        },
      },
    },
  },
  gtm_catalog: {
    title: 'Templates catalog intro',
    content: {
      schema_version: 1,
      section_order: ['intro'],
      sections: {
        intro: {
          type: 'catalog_intro',
          id: 'sec_catalog_intro',
          props: {
            headline: 'Template Marketplace',
            body: 'Chọn theme theo ngành và mục tiêu — demo live, trial self-serve, mua license khi sẵn sàng. Catalog cards lấy từ API; CMS chỉ chỉnh intro.',
          },
          style: {},
        },
      },
    },
  },
};

export function getPlatformStarter(key: string) {
  return PLATFORM_STARTERS[key] || null;
}
