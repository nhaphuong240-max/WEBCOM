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
  gtm_solution: {
    title: 'Solution module',
    content: {
      schema_version: 1,
      section_order: ['header', 'workflow', 'kpis', 'showcase', 'matrix', 'cta'],
      sections: {
        header: {
          type: 'page_header',
          id: 'sec_sol_header',
          props: {
            eyebrow: 'Solution',
            title: 'Website Commerce',
            body: 'Theme marketplace · Brand Kit · Go-live gate — mở storefront bán được trong ngày.',
          },
          style: {},
        },
        workflow: {
          type: 'problem_workflow',
          id: 'sec_sol_flow',
          props: {
            problem: 'Merchant mất tuần để theme + checkout + publish an toàn.',
            steps: [
              { title: 'Chọn theme', body: 'Catalog theo ngành / mục tiêu' },
              { title: 'Brand Kit', body: 'Token màu/font áp vào storefront' },
              { title: 'Go-live gate', body: 'Checklist chặn publish thiếu SKU / SEO / consent' },
            ],
          },
          style: {},
        },
        kpis: {
          type: 'kpi_row',
          id: 'sec_sol_kpi',
          props: {
            items: [
              { label: 'Time-to-theme', value: '< 1 ngày' },
              { label: 'Rollback', value: '1-click' },
              { label: 'Shared CMS', value: '1 engine' },
            ],
          },
          style: {},
        },
        showcase: {
          type: 'ui_showcase',
          id: 'sec_sol_ui',
          props: {
            title: 'Builder + Go-live trên một pipeline',
            body: 'Cùng Page/PageVersion với merchant storefront — không fork CMS.',
            bullets: ['Visual canvas', 'Staging preview', 'Publish audit'],
          },
          style: {},
        },
        matrix: {
          type: 'capability_matrix',
          id: 'sec_sol_matrix',
          props: {
            peer_column_label: 'Omnichannel phổ biến',
            rows: [
              {
                feature: 'Theme marketplace + trial',
                webcom: 'Có',
                peer_label: 'Hạn chế / upsell',
              },
              {
                feature: 'Go-live gate + rollback',
                webcom: 'Có',
                peer_label: 'Publish thủ công',
              },
              {
                feature: 'POS ↔ web tồn/giá',
                webcom: 'Có',
                peer_label: 'Tích hợp riêng',
              },
            ],
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_sol_cta',
          props: {
            headline: 'Xem theme Website Commerce',
            body: 'Demo live hoặc bắt đầu trial.',
            cta: { label: 'Xem templates', href: '/templates?goal=conversion', cta_code: 'cta_templates' },
          },
          style: {},
        },
      },
    },
  },
  gtm_industry: {
    title: 'Industry page',
    content: {
      schema_version: 1,
      section_order: ['header', 'cases', 'cta'],
      sections: {
        header: {
          type: 'page_header',
          id: 'sec_ind_header',
          props: {
            eyebrow: 'Industry',
            title: 'Mỹ phẩm & Beauty',
            body: 'Theme mobile-first, live social, loyalty — playbook AURA Beauty.',
          },
          style: {},
        },
        cases: {
          type: 'use_case_cards',
          id: 'sec_ind_cards',
          props: {
            items: [
              {
                title: 'Serum drop + live',
                body: 'Landing campaign + keyword order',
                href: '/templates?industry=beauty&goal=live',
                icon: 'beauty',
              },
              {
                title: 'Omnichannel quầy',
                body: 'Giá/tồn đồng bộ POS',
                href: '/templates?industry=beauty&goal=omnichannel',
                icon: 'pos',
              },
            ],
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_ind_cta',
          props: {
            headline: 'Xem theme Beauty',
            body: '',
            cta: {
              label: 'Browse Beauty',
              href: '/templates?industry=beauty',
              cta_code: 'cta_templates',
            },
          },
          style: {},
        },
      },
    },
  },
  gtm_case: {
    title: 'Case study',
    content: {
      schema_version: 1,
      section_order: ['hero', 'kpi', 'roi', 'cta'],
      sections: {
        hero: {
          type: 'case_hero',
          id: 'sec_case_hero',
          props: {
            title: 'AURA Beauty — tăng CVR mobile sau Go-live',
            customer: 'AURA Beauty VN',
            industry: 'beauty',
            hero_metric: '+28% CVR mobile',
          },
          style: {},
        },
        kpi: {
          type: 'before_after_kpi',
          id: 'sec_case_kpi',
          props: {
            metrics: [
              { label: 'CVR mobile', before: '1.8%', after: '2.3%' },
              { label: 'LCP (p75)', before: '3.4s', after: '1.9s' },
            ],
          },
          style: {},
        },
        roi: {
          type: 'roi_assumptions',
          id: 'sec_case_roi',
          props: {
            assumptions: [
              { label: 'Traffic baseline', value: '40k sessions/tháng', note: 'Mobile-heavy' },
              { label: 'AOV', value: '450.000₫', note: 'Không đổi trước/sau' },
              { label: 'Margin contribution', value: '+12pp', note: 'Sau giảm paid CAC' },
            ],
            disclaimer:
              'Con số minh họa từ merchant pilot — không phải cam kết ROI. Kết quả phụ thuộc catalog, traffic và vận hành.',
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_case_cta',
          props: {
            headline: 'Muốn kết quả tương tự?',
            body: 'Đặt demo với sales — SLA first-touch 4h giờ làm việc.',
            cta: { label: 'Đặt demo', href: '/#lead', cta_code: 'cta_book_demo' },
          },
          style: {},
        },
      },
    },
  },
  gtm_resources: {
    title: 'Resources hub',
    content: {
      schema_version: 1,
      section_order: ['header', 'list', 'gate'],
      sections: {
        header: {
          type: 'page_header',
          id: 'sec_res_header',
          props: {
            eyebrow: 'Resources',
            title: 'Tài nguyên vận hành',
            body: 'Runbook, checklist go-live và playbook — một số tài liệu gated sau lead.',
          },
          style: {},
        },
        list: {
          type: 'resource_list',
          id: 'sec_res_list',
          props: {
            headline: 'Thư viện',
            items: [
              {
                title: 'Go-live checklist',
                type: 'checklist',
                href: '/resources/golive-checklist',
                gated: true,
                summary: 'SKU · SEO · consent · payment trước publish',
              },
              {
                title: 'Publish fail runbook',
                type: 'runbook',
                href: '/resources/publish-fail',
                gated: false,
                summary: 'Rollback & health window',
              },
              {
                title: 'Theme marketplace FAQ',
                type: 'guide',
                href: '/pricing',
                gated: false,
                summary: 'License one-time vs trial',
              },
            ],
          },
          style: {},
        },
        gate: {
          type: 'gated_form',
          id: 'sec_res_gate',
          props: {
            headline: 'Mở khóa Go-live checklist',
            body: 'Để lại email công việc — nhận link tải ngay trên trang.',
            fields: ['name', 'email', 'company'],
            submit_label: 'Mở khóa tài liệu',
            unlock_href: '/resources/golive-checklist',
            cta_code: 'cta_resource_unlock',
            consent_label: 'Tôi đồng ý để WebCom liên hệ theo privacy.',
          },
          style: {},
        },
      },
    },
  },
  gtm_resource_detail: {
    title: 'Resource detail (gated)',
    content: {
      schema_version: 1,
      section_order: ['header', 'gate'],
      sections: {
        header: {
          type: 'page_header',
          id: 'sec_rd_header',
          props: {
            eyebrow: 'Checklist',
            title: 'Go-live checklist',
            body: 'Nội dung đầy đủ mở sau khi gửi lead — hoặc dùng form bên dưới.',
          },
          style: {},
        },
        gate: {
          type: 'gated_form',
          id: 'sec_rd_gate',
          props: {
            headline: 'Unlock checklist PDF',
            body: 'Sau submit bạn thấy link tải ngay (không chờ email).',
            fields: ['name', 'email', 'company'],
            submit_label: 'Unlock',
            unlock_href: 'https://webecom.ngoinhahomnay.vn/docs/runbooks/publish-fail.md',
            cta_code: 'cta_resource_unlock',
          },
          style: {},
        },
      },
    },
  },
  gtm_tour: {
    title: 'Product tour',
    content: {
      schema_version: 1,
      section_order: ['header', 'tour', 'cta'],
      sections: {
        header: {
          type: 'page_header',
          id: 'sec_tour_header',
          props: {
            eyebrow: 'Product tour',
            title: 'WebCom OS trong 5 bước',
            body: 'Theme → Brand Kit → Go-live → Live/POS → CRM.',
          },
          style: {},
        },
        tour: {
          type: 'tour_steps',
          id: 'sec_tour',
          props: {
            title: 'Tour',
            steps: [
              {
                title: 'Chọn theme',
                body: 'Catalog theo ngành — demo live trước khi trial.',
                cta_label: 'Xem templates',
                cta_href: '/templates',
              },
              {
                title: 'Brand Kit',
                body: 'Token màu/font áp vào storefront — không fork theme.',
              },
              {
                title: 'Go-live gate',
                body: 'Checklist chặn publish thiếu SKU / SEO / consent.',
              },
              {
                title: 'Live & POS',
                body: 'Keyword order + barcode sell — tồn realtime.',
              },
              {
                title: 'CRM 360',
                body: 'Profile + loyalty ledger sau first order.',
                cta_label: 'Đặt demo',
                cta_href: '/#lead',
              },
            ],
          },
          style: {},
        },
        cta: {
          type: 'cta_band',
          id: 'sec_tour_cta',
          props: {
            headline: 'Sẵn sàng dùng thử?',
            body: 'Trial self-serve hoặc book demo.',
            cta: { label: 'Bắt đầu trial', href: '/trial', cta_code: 'cta_trial' },
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
