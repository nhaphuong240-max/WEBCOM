import {
  AnnounceBar,
  BeforeAfterKpi,
  CapabilityMatrix,
  CaseHero,
  CatalogIntro,
  CtaBand,
  FaqBlock,
  GatedForm,
  IndustryStrip,
  KpiRow,
  ModuleGrid,
  PageHeader,
  PlatformHero,
  PricingTable,
  ProblemWorkflow,
  ProofStrip,
  ResourceList,
  RoiAssumptions,
  TourSteps,
  UiShowcase,
  UseCaseCards,
} from './PlatformSections';
import type { PlatformExperimentPayload } from '../../lib/platform-ab';

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
  experimentCode,
  experiment,
  storefrontId,
}: {
  content: ContentV1 | null | undefined;
  /** PC3-6 */
  experimentCode?: string | null;
  experiment?: PlatformExperimentPayload | null;
  storefrontId?: string | null;
}) {
  if (!content?.section_order?.length) return null;

  const ab = {
    code: experimentCode,
    experiment: experiment || null,
    storefrontId: storefrontId || null,
  };

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
            return <PlatformHero key={key} props={props} ab={ab} />;
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
          case 'page_header':
            return <PageHeader key={key} props={props} />;
          case 'problem_workflow':
            return <ProblemWorkflow key={key} props={props} />;
          case 'kpi_row':
            return <KpiRow key={key} props={props} />;
          case 'ui_showcase':
            return <UiShowcase key={key} props={props} />;
          case 'use_case_cards':
            return <UseCaseCards key={key} props={props} />;
          case 'case_hero':
            return <CaseHero key={key} props={props} />;
          case 'before_after_kpi':
            return <BeforeAfterKpi key={key} props={props} />;
          case 'capability_matrix':
            return <CapabilityMatrix key={key} props={props} />;
          case 'roi_assumptions':
            return <RoiAssumptions key={key} props={props} />;
          case 'resource_list':
            return <ResourceList key={key} props={props} />;
          case 'gated_form':
            return <GatedForm key={key} props={props} />;
          case 'tour_steps':
            return <TourSteps key={key} props={props} />;
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
