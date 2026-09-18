const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') ||
  process.env.INTERNAL_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3001';

export const DEMO_HOST =
  process.env.NEXT_PUBLIC_DEMO_URL?.replace(/\/$/, '') || 'https://themes.ngoinhahomnay.vn';

export const CONSOLE_HOST =
  process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ||
  'https://webecom.ngoinhahomnay.vn/console';

export type TemplateCard = {
  id: string;
  code: string;
  name: string;
  industry: string;
  goal: string;
  license: string;
  license_tier?: string;
  scores?: { cvr?: number; mobile?: number; seo?: number };
  features?: string[];
  supports?: string[];
  has_package?: boolean;
  package_version?: string | null;
  playbook?: string[];
};

export type TemplateDetail = TemplateCard & {
  demo_url: string;
  trial_url: string;
  buy_theme_url: string;
  starter_headline?: string | null;
  tokens?: Record<string, string> | null;
  layouts?: { home?: string[] } | null;
  media?: Array<{ type: string; url: string }>;
  cta?: { demo: string; trial: string; buy: string };
  monetize?: string;
  trial_before_paywall?: boolean;
};

export type TemplateFacets = {
  industries: string[];
  goals: string[];
  licenses: string[];
  sorts: string[];
};

export async function fetchTemplates(params: {
  industry?: string;
  goal?: string;
  license?: string;
  sort?: string;
  q?: string;
}): Promise<TemplateCard[]> {
  const qs = new URLSearchParams();
  if (params.industry) qs.set('industry', params.industry);
  if (params.goal) qs.set('goal', params.goal);
  if (params.license) qs.set('license', params.license);
  if (params.sort) qs.set('sort', params.sort);
  if (params.q) qs.set('q', params.q);
  const qstr = qs.toString();
  try {
    const res = await fetch(`${API}/api/v1/public/templates${qstr ? `?${qstr}` : ''}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as TemplateCard[];
  } catch {
    return [];
  }
}

export async function fetchTemplateFacets(): Promise<TemplateFacets> {
  try {
    const res = await fetch(`${API}/api/v1/public/templates/facets`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) {
      return { industries: [], goals: [], licenses: [], sorts: ['cvr', 'mobile', 'seo'] };
    }
    return (await res.json()) as TemplateFacets;
  } catch {
    return { industries: [], goals: [], licenses: [], sorts: ['cvr', 'mobile', 'seo'] };
  }
}

export async function fetchTemplateDetail(code: string): Promise<TemplateDetail | null> {
  try {
    const res = await fetch(`${API}/api/v1/public/templates/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TemplateDetail;
  } catch {
    return null;
  }
}

export function demoUrl(code: string) {
  return `${DEMO_HOST}/?demo=${encodeURIComponent(code)}`;
}

export function trialUrl(code: string) {
  return `/trial?template=${encodeURIComponent(code)}`;
}

export function buyUrl(code: string) {
  return `${CONSOLE_HOST}/website/templates?focus=${encodeURIComponent(code)}`;
}

export function facetHref(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const next = { ...base, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/templates?${s}` : '/templates';
}
