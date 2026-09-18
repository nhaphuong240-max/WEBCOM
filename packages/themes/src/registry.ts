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
] as const;

export type SectionKey = (typeof SECTION_REGISTRY)[number]['key'];

export const SECTION_KEYS = new Set<string>(SECTION_REGISTRY.map((s) => s.key));

export function getSectionDef(key: string) {
  return SECTION_REGISTRY.find((s) => s.key === key) || null;
}
