import {
  AnnounceBar,
  CatalogIntro,
  CtaBand,
  FaqBlock,
  IndustryStrip,
  ModuleGrid,
  PlatformHero,
  PricingTable,
  ProofStrip,
} from './PlatformSections';

type ContentV1 = {
  schema_version: number;
  section_order: string[];
  sections: Record<
    string,
    { type: string; id: string; props: Record<string, unknown>; style?: Record<string, unknown> }
  >;
};

/** Render Platform CMS ContentV1 — unknown types hidden (AC-P6). */
export function SectionStackPlatform({
  content,
}: {
  content: ContentV1 | null | undefined;
}) {
  if (!content?.section_order?.length) return null;

  return (
    <div className="pcms-stack">
      {content.section_order.map((key) => {
        const node = content.sections[key];
        if (!node) return null;
        const props = (node.props || {}) as Record<string, unknown>;
        switch (node.type) {
          case 'announce_bar':
            return <AnnounceBar key={key} props={props} />;
          case 'platform_hero':
          case 'hero':
            return <PlatformHero key={key} props={props} />;
          case 'social_proof':
          case 'trust':
            return <ProofStrip key={key} props={normalizeTrust(props)} />;
          case 'module_grid':
            return <ModuleGrid key={key} props={props} />;
          case 'industry_strip':
            return <IndustryStrip key={key} props={props} />;
          case 'pricing_table':
            return <PricingTable key={key} props={props} />;
          case 'catalog_intro':
            return <CatalogIntro key={key} props={props} />;
          case 'faq':
            return <FaqBlock key={key} props={props} />;
          case 'cta_band':
          case 'cta_banner':
            return <CtaBand key={key} props={normalizeCtaBanner(props)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function normalizeTrust(props: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(props.items) && props.items.length && typeof props.items[0] === 'string') {
    return {
      items: (props.items as string[]).map((label) => ({ n: '•', label })),
    };
  }
  return props;
}

function normalizeCtaBanner(props: Record<string, unknown>): Record<string, unknown> {
  if (props.cta && typeof props.cta === 'object') return props;
  return {
    headline: props.title || props.headline,
    body: props.body || '',
    cta: {
      label: props.cta || 'Go',
      href: props.cta_href || '#',
      cta_code: props.cta_code || 'cta_book_demo',
    },
  };
}
