const API =
  (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || '')
    .replace(/\/$/, '') || 'http://127.0.0.1:3001';

export type DemoSection = {
  type: string;
  id: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
};

export type DemoContentV1 = {
  schema_version: number;
  section_order: string[];
  sections: Record<string, DemoSection>;
};

export type DemoPackagePayload = {
  code: string;
  name: string;
  content: Record<string, unknown>;
  content_v1: DemoContentV1;
  tokens: Record<string, string>;
};

function demoPackageEnabled() {
  const raw =
    process.env.FEATURE_CMS_DEMO_PACKAGE ?? process.env.NEXT_PUBLIC_FEATURE_CMS_DEMO_PACKAGE;
  if (raw === undefined) return true;
  return raw === '1' || raw === 'true';
}

export async function loadDemoPackage(code: string): Promise<DemoPackagePayload | null> {
  if (!code || !demoPackageEnabled()) return null;
  try {
    const res = await fetch(`${API}/api/v1/public/theme-packages/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      name: string;
      starter?: {
        home?: DemoContentV1;
        home_legacy?: Record<string, unknown>;
        tokens?: Record<string, string>;
      };
    };
    const home = data.starter?.home;
    if (!home?.section_order || !home.sections) return null;
    return {
      code: data.code,
      name: data.name,
      content_v1: home,
      content: data.starter?.home_legacy || {},
      tokens: data.starter?.tokens || {},
    };
  } catch {
    return null;
  }
}
