import type { DemoContentV1, DemoSection } from './demo-package';

/** Lightweight dual-read for storefront (no @ptt/themes dependency). */
export function normalizeContent(raw: Record<string, unknown> | null | undefined): DemoContentV1 {
  if (!raw || typeof raw !== 'object') {
    return { schema_version: 1, section_order: [], sections: {} };
  }

  if (raw.schema_version === 1 && raw.sections && typeof raw.sections === 'object') {
    const order = Array.isArray(raw.section_order)
      ? (raw.section_order as unknown[]).map(String)
      : Object.keys(raw.sections as object);
    const sections: Record<string, DemoSection> = {};
    for (const [key, node] of Object.entries(raw.sections as Record<string, unknown>)) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      sections[key] = {
        type: String(n.type || key),
        id: String(n.id || `sec_${key}`),
        props: (n.props as Record<string, unknown>) || {},
        style: (n.style as Record<string, unknown>) || {},
      };
    }
    return { schema_version: 1, section_order: order, sections };
  }

  const order = Array.isArray(raw.section_order)
    ? (raw.section_order as unknown[]).map(String)
    : ['hero', 'trust', 'featured'].filter((k) => k in raw);

  const sections: Record<string, DemoSection> = {};
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
    if (val && typeof val === 'object') {
      sections[key] = {
        type: key,
        id: `sec_${key}`,
        props: { ...(val as Record<string, unknown>) },
        style: {},
      };
    }
  }
  return { schema_version: 1, section_order: order, sections };
}
