export const SECTION_REGISTRY = [
  {
    key: 'hero',
    label: 'Hero',
    fields: ['eyebrow', 'headline', 'cta', 'cta_href', 'media_id'],
    props_schema: {
      type: 'object',
      properties: {
        eyebrow: { type: 'string' },
        headline: { type: 'string' },
        cta: { type: 'string' },
        cta_href: { type: 'string' },
        media_id: { type: ['string', 'null'] },
      },
      required: ['headline'],
    },
  },
  {
    key: 'collections',
    label: 'Collections strip',
    fields: ['source', 'slugs'],
    props_schema: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['theme', 'manual'] },
        slugs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    key: 'featured',
    label: 'Featured products',
    fields: ['limit', 'collection_slug'],
    props_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        collection_slug: { type: 'string' },
      },
    },
  },
  {
    key: 'trust',
    label: 'Trust badges',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' } },
      },
      required: ['items'],
    },
  },
  {
    key: 'rich_text',
    label: 'Rich text',
    fields: ['title', 'body'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
    },
  },
  {
    key: 'faq',
    label: 'FAQ',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { q: { type: 'string' }, a: { type: 'string' } },
            required: ['q', 'a'],
          },
        },
      },
    },
  },
  {
    key: 'cta_banner',
    label: 'CTA banner',
    fields: ['title', 'cta', 'cta_href'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        cta: { type: 'string' },
        cta_href: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    key: 'countdown',
    label: 'Countdown',
    fields: ['label', 'ends_at'],
    props_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        ends_at: { type: 'string' },
      },
    },
  },
  {
    key: 'footer',
    label: 'Footer legal',
    fields: ['from_brand_kit'],
    props_schema: {
      type: 'object',
      properties: {
        from_brand_kit: { type: 'boolean' },
      },
    },
  },
  {
    key: 'footer_links',
    label: 'Footer links',
    fields: ['columns'],
    props_schema: {
      type: 'object',
      properties: {
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              links: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    href: { type: 'string' },
                  },
                  required: ['label', 'href'],
                },
              },
            },
            required: ['title', 'links'],
          },
        },
      },
      required: ['columns'],
    },
  },
  {
    key: 'announcement',
    label: 'Announcement bar',
    fields: ['text', 'href', 'dismissible'],
    props_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        href: { type: 'string' },
        dismissible: { type: 'boolean' },
      },
      required: ['text'],
    },
  },
  {
    key: 'testimonial',
    label: 'Testimonials',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              author: { type: 'string' },
              role: { type: 'string' },
            },
            required: ['quote', 'author'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'video',
    label: 'Video embed',
    fields: ['url', 'poster', 'caption'],
    props_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        poster: { type: 'string' },
        caption: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    key: 'product_grid',
    label: 'Product grid (advanced)',
    fields: ['limit', 'collection_slug', 'sort', 'columns'],
    props_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        collection_slug: { type: 'string' },
        sort: { type: 'string', enum: ['manual', 'price_asc', 'price_desc', 'newest'] },
        columns: { type: 'number' },
      },
    },
  },
  {
    key: 'lead_form',
    label: 'Lead form',
    fields: ['title', 'cta', 'consent_label'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        cta: { type: 'string' },
        consent_label: { type: 'string' },
      },
    },
  },
  {
    key: 'hero_slider',
    label: 'Hero slider',
    fields: ['slides'],
    props_schema: {
      type: 'object',
      properties: {
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              href: { type: 'string' },
              cta: { type: 'string' },
              alt: { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    key: 'flash_sale',
    label: 'Flash sale',
    fields: ['title', 'badge', 'ends_at', 'product_ids'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        badge: { type: 'string' },
        ends_at: { type: ['string', 'null'] },
        product_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    key: 'promo_banner',
    label: 'Promo banner',
    fields: ['title', 'href', 'ends_at'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        href: { type: 'string' },
        ends_at: { type: ['string', 'null'] },
      },
    },
  },
  {
    key: 'collection_banner',
    label: 'Collection banner',
    fields: ['title', 'banner_url', 'collection_slug'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        banner_url: { type: 'string' },
        collection_slug: { type: 'string' },
      },
    },
  },
  {
    key: 'bundle_offer',
    label: 'Bundle offer',
    fields: ['label', 'sku_ids'],
    props_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        sku_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  // ─── Platform CMS (CORP-CMS-1) ─────────────────────────────
  {
    key: 'announce_bar',
    label: 'Announce bar (Platform)',
    fields: ['text', 'cta_label', 'href', 'cta_code', 'tone', 'ends_at'],
    props_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        cta_label: { type: 'string' },
        href: { type: 'string' },
        cta_code: { type: 'string' },
        tone: { type: 'string', enum: ['info', 'promo', 'warning'] },
        ends_at: { type: ['string', 'null'] },
      },
      required: ['text'],
    },
  },
  {
    key: 'platform_hero',
    label: 'Hero GTM (Platform)',
    fields: ['headline', 'sub', 'primary_cta', 'secondary_cta', 'search_enabled'],
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        sub: { type: 'string' },
        primary_cta: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            href: { type: 'string' },
            cta_code: { type: 'string' },
          },
          required: ['label', 'href', 'cta_code'],
        },
        secondary_cta: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            href: { type: 'string' },
            cta_code: { type: 'string' },
          },
        },
        search_enabled: { type: 'boolean' },
      },
      required: ['headline', 'primary_cta'],
    },
  },
  {
    key: 'social_proof',
    label: 'Social proof (Platform)',
    fields: ['items', 'logos'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { n: { type: 'string' }, label: { type: 'string' } },
            required: ['n', 'label'],
          },
        },
        logos: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    key: 'module_grid',
    label: 'Module grid (Platform)',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              href: { type: 'string' },
              icon: { type: 'string' },
            },
            required: ['title', 'body'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'industry_strip',
    label: 'Industry strip (Platform)',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              href: { type: 'string' },
              icon: { type: 'string' },
            },
            required: ['key', 'label'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'pricing_table',
    label: 'Pricing table (Platform)',
    fields: ['plans', 'theme_note'],
    props_schema: {
      type: 'object',
      properties: {
        plans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string' },
              features: { type: 'array', items: { type: 'string' } },
              cta: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  href: { type: 'string' },
                  cta_code: { type: 'string' },
                },
                required: ['label', 'href', 'cta_code'],
              },
              featured: { type: 'boolean' },
              layer: { type: 'string', enum: ['theme', 'platform', 'addon'] },
            },
            required: ['name', 'price', 'features', 'cta'],
          },
        },
        theme_note: { type: 'string' },
      },
      required: ['plans'],
    },
  },
  {
    key: 'catalog_intro',
    label: 'Catalog intro (Platform)',
    fields: ['headline', 'body'],
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['headline'],
    },
  },
  {
    key: 'cta_band',
    label: 'CTA band (Platform)',
    fields: ['headline', 'body', 'cta'],
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        cta: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            href: { type: 'string' },
            cta_code: { type: 'string' },
          },
          required: ['label', 'href', 'cta_code'],
        },
      },
      required: ['headline', 'cta'],
    },
  },
  // ─── Platform CMS CORP-CMS-2 ───────────────────────────────
  {
    key: 'page_header',
    label: 'Page header (Platform)',
    fields: ['eyebrow', 'title', 'body'],
    props_schema: {
      type: 'object',
      properties: {
        eyebrow: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    key: 'problem_workflow',
    label: 'Problem workflow (Platform)',
    fields: ['problem', 'steps', 'ui_media'],
    props_schema: {
      type: 'object',
      properties: {
        problem: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, body: { type: 'string' } },
            required: ['title'],
          },
        },
        ui_media: { type: 'string' },
      },
      required: ['problem', 'steps'],
    },
  },
  {
    key: 'kpi_row',
    label: 'KPI row (Platform)',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'string' } },
            required: ['label', 'value'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'ui_showcase',
    label: 'UI showcase (Platform)',
    fields: ['title', 'body', 'media_url', 'bullets'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        media_url: { type: 'string' },
        bullets: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
  },
  {
    key: 'use_case_cards',
    label: 'Use case cards (Platform)',
    fields: ['items'],
    props_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              href: { type: 'string' },
              icon: { type: 'string' },
            },
            required: ['title', 'body'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'case_hero',
    label: 'Case hero (Platform)',
    fields: ['title', 'customer', 'industry', 'hero_metric'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        customer: { type: 'string' },
        industry: { type: 'string' },
        hero_metric: { type: 'string' },
      },
      required: ['title', 'customer'],
    },
  },
  {
    key: 'before_after_kpi',
    label: 'Before/After KPI (Platform)',
    fields: ['metrics'],
    props_schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              before: { type: 'string' },
              after: { type: 'string' },
            },
            required: ['label', 'before', 'after'],
          },
        },
      },
      required: ['metrics'],
    },
  },
  {
    key: 'capability_matrix',
    label: 'Capability matrix (Platform)',
    fields: ['rows', 'peer_column_label'],
    props_schema: {
      type: 'object',
      properties: {
        peer_column_label: { type: 'string' },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              feature: { type: 'string' },
              webcom: { type: 'string' },
              peer_label: { type: 'string' },
            },
            required: ['feature', 'webcom', 'peer_label'],
          },
        },
      },
      required: ['rows'],
    },
  },
  // ─── Platform CMS CORP-CMS-3 ───────────────────────────────
  {
    key: 'roi_assumptions',
    label: 'ROI assumptions (Platform)',
    fields: ['assumptions', 'disclaimer'],
    props_schema: {
      type: 'object',
      properties: {
        assumptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['label', 'value'],
          },
        },
        disclaimer: { type: 'string' },
      },
      required: ['assumptions', 'disclaimer'],
    },
  },
  {
    key: 'resource_list',
    label: 'Resource list (Platform)',
    fields: ['items', 'headline'],
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              type: { type: 'string' },
              href: { type: 'string' },
              gated: { type: 'boolean' },
              summary: { type: 'string' },
            },
            required: ['title', 'type', 'href'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    key: 'gated_form',
    label: 'Gated form (Platform)',
    fields: ['headline', 'body', 'fields', 'submit_label', 'unlock_href', 'cta_code'],
    props_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        fields: {
          type: 'array',
          items: { type: 'string' },
        },
        submit_label: { type: 'string' },
        unlock_href: { type: 'string' },
        cta_code: { type: 'string' },
        consent_label: { type: 'string' },
      },
      required: ['headline', 'unlock_href'],
    },
  },
  {
    key: 'tour_steps',
    label: 'Product tour (Platform)',
    fields: ['title', 'steps'],
    props_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              media: { type: 'string' },
              cta_label: { type: 'string' },
              cta_href: { type: 'string' },
            },
            required: ['title', 'body'],
          },
        },
      },
      required: ['steps'],
    },
  },
] as const;

export type SectionKey = (typeof SECTION_REGISTRY)[number]['key'];

export const SECTION_KEYS = new Set<string>(SECTION_REGISTRY.map((s) => s.key));

/** CORP-CMS-1 — CTA taxonomy (AC-B1) */
export const PLATFORM_CTA_CODES = [
  'cta_templates',
  'cta_demo_live',
  'cta_trial',
  'cta_buy_theme',
  'cta_book_demo',
  'cta_pricing',
  'cta_resource_unlock',
] as const;

export type PlatformCtaCode = (typeof PLATFORM_CTA_CODES)[number];

export const PLATFORM_CTA_CODE_SET = new Set<string>(PLATFORM_CTA_CODES);

/** storefront | platform | shared — filter builder palette */
export type SectionScope = 'storefront' | 'platform' | 'shared';

const PLATFORM_ONLY = new Set([
  'announce_bar',
  'platform_hero',
  'social_proof',
  'module_grid',
  'industry_strip',
  'pricing_table',
  'catalog_intro',
  'cta_band',
  'page_header',
  'problem_workflow',
  'kpi_row',
  'ui_showcase',
  'use_case_cards',
  'case_hero',
  'before_after_kpi',
  'capability_matrix',
  'roi_assumptions',
  'resource_list',
  'gated_form',
  'tour_steps',
]);

/** Q3 default — no competitor brand names */
export const PLATFORM_PEER_COLUMN_DEFAULT = 'Omnichannel phổ biến';

const SHARED = new Set(['faq', 'rich_text']);

export function getSectionScope(key: string): SectionScope {
  if (PLATFORM_ONLY.has(key)) return 'platform';
  if (SHARED.has(key)) return 'shared';
  return 'storefront';
}

export function sectionsForScope(scope?: string | null) {
  if (!scope || scope === 'all') return [...SECTION_REGISTRY];
  return SECTION_REGISTRY.filter((s) => {
    const sc = getSectionScope(s.key);
    if (scope === 'platform') return sc === 'platform' || sc === 'shared';
    if (scope === 'storefront') return sc === 'storefront' || sc === 'shared';
    return true;
  });
}

/** Icon allowlist for module_grid / industry_strip (AC-UI2) */
export const PLATFORM_ICON_ALLOWLIST = [
  'spark',
  'cart',
  'live',
  'pos',
  'crm',
  'ai',
  'fashion',
  'electronics',
  'beauty',
  'b2b',
  'home',
  'jewelry',
  'fnb',
  'health',
  'pets',
  'general',
] as const;

export function getSectionDef(key: string) {
  return SECTION_REGISTRY.find((s) => s.key === key) || null;
}
