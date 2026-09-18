import { createId } from './id';
import { SECTION_KEYS } from './registry';
import type { ContentV1, SectionNode } from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Legacy flat builder payload → ContentV1 */
export function normalizeContent(raw: unknown): ContentV1 {
  if (!isPlainObject(raw)) {
    return { schema_version: 1, section_order: [], sections: {} };
  }

  if (raw.schema_version === 1 && isPlainObject(raw.sections)) {
    const order = Array.isArray(raw.section_order)
      ? (raw.section_order as unknown[]).map(String)
      : Object.keys(raw.sections);
    const sections: Record<string, SectionNode> = {};
    for (const key of order) {
      const node = (raw.sections as Record<string, unknown>)[key];
      if (!isPlainObject(node)) continue;
      const type = String(node.type || key);
      sections[key] = {
        type,
        id: String(node.id || `sec_${key}`),
        props: isPlainObject(node.props) ? { ...node.props } : {},
        style: isPlainObject(node.style) ? { ...node.style } : {},
      };
    }
    // keep sections not in order
    for (const [key, node] of Object.entries(raw.sections as Record<string, unknown>)) {
      if (sections[key] || !isPlainObject(node)) continue;
      sections[key] = {
        type: String(node.type || key),
        id: String(node.id || `sec_${key}`),
        props: isPlainObject(node.props) ? { ...node.props } : {},
        style: isPlainObject(node.style) ? { ...node.style } : {},
      };
    }
    return { schema_version: 1, section_order: order, sections };
  }

  // Legacy: section_order + top-level keys (hero, trust, …)
  const order = Array.isArray(raw.section_order)
    ? (raw.section_order as unknown[]).map(String)
    : ['hero', 'trust', 'featured'].filter((k) => k in raw);

  const sections: Record<string, SectionNode> = {};
  for (const key of order) {
    const val = raw[key];
    if (key === 'trust' && Array.isArray(val)) {
      sections[key] = {
        type: 'trust',
        id: `sec_${key}`,
        props: { items: val.map(String) },
        style: {},
      };
      continue;
    }
    if (isPlainObject(val)) {
      sections[key] = {
        type: key,
        id: `sec_${key}`,
        props: { ...val },
        style: {},
      };
    }
  }

  return { schema_version: 1, section_order: order, sections };
}

/** ContentV1 → legacy flat (for dual-write / old storefront readers) */
export function toLegacyFlat(content: ContentV1): Record<string, unknown> {
  const out: Record<string, unknown> = {
    schema_version: 1,
    section_order: [...content.section_order],
  };
  for (const key of content.section_order) {
    const node = content.sections[key];
    if (!node) continue;
    if (node.type === 'trust') {
      out.trust = (node.props.items as string[]) || [];
    } else {
      out[key] = { ...node.props };
    }
  }
  return out;
}

export type ValidateIssue = { path: string; message: string };

export function validateContentV1(content: ContentV1): ValidateIssue[] {
  const issues: ValidateIssue[] = [];
  if (content.schema_version !== 1) {
    issues.push({ path: 'schema_version', message: 'must be 1' });
  }
  for (const key of content.section_order) {
    const node = content.sections[key];
    if (!node) {
      issues.push({ path: `sections.${key}`, message: 'missing section for order entry' });
      continue;
    }
    if (!SECTION_KEYS.has(node.type)) {
      issues.push({ path: `sections.${key}.type`, message: `unknown section type: ${node.type}` });
    }
    if (!node.id) {
      issues.push({ path: `sections.${key}.id`, message: 'id required' });
    }
  }
  return issues;
}

export function assertValidContent(content: ContentV1): void {
  const issues = validateContentV1(content);
  if (issues.length) {
    throw new Error(issues.map((i) => `${i.path}: ${i.message}`).join('; '));
  }
}

/** Ensure ids exist when building starter */
export function ensureSectionIds(content: ContentV1): ContentV1 {
  const sections = { ...content.sections };
  for (const [key, node] of Object.entries(sections)) {
    if (!node.id) {
      sections[key] = { ...node, id: createId(`sec_${key}`) };
    }
  }
  return { ...content, sections };
}
