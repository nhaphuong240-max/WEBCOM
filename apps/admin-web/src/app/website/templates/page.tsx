import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson, getSessionStorefrontId } from '../../../lib/api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { InstallWithCompat } from './install-with-compat';

export const dynamic = 'force-dynamic';

type Template = {
  id: string;
  code: string;
  name: string;
  industry: string;
  goal: string;
  license: string;
  scores: { cvr?: number; mobile?: number; seo?: number };
  features: string[];
};

type License = {
  template_code: string;
  status: string;
};

async function installTemplate(code: string) {
  'use server';
  const SF = await getSessionStorefrontId();
  await apiJson(`/v1/admin/storefronts/${SF}/templates/${code}/install`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'theme_match',
    done: true,
  });
  revalidatePath('/website/templates');
  revalidatePath('/website/themes');
  redirect(`/website/templates?installed=${encodeURIComponent(code)}`);
}

async function checkCompat(code: string): Promise<{
  ok?: boolean;
  warnings?: Array<string | { message?: string }>;
  legacy_sections?: string[];
}> {
  'use server';
  const SF = await getSessionStorefrontId();
  return apiJson(`/v1/admin/storefronts/${SF}/themes/compatibility-check`, 'POST', {
    template_code: code,
  });
}

async function buyTheme(code: string) {
  'use server';
  const inv = await apiJson<{
    invoice_id: string | null;
    status: string;
    qr_image_url?: string | null;
  }>('/v1/admin/theme-licenses/invoices', 'POST', { template_code: code });
  if (inv.status === 'paid' || !inv.invoice_id) {
    revalidatePath('/website/templates');
    redirect(`/website/templates?licensed=${encodeURIComponent(code)}`);
  }
  redirect(`/website/templates?invoice=${encodeURIComponent(inv.invoice_id)}`);
}

async function simulatePaid(invoiceId: string) {
  'use server';
  const res = await apiJson<{
    invoice: { template_code?: string };
  }>(`/v1/admin/theme-licenses/invoices/${invoiceId}/simulate-paid`, 'POST', {});
  const code = res.invoice?.template_code || '';
  revalidatePath('/website/templates');
  redirect(`/website/templates?licensed=${encodeURIComponent(code)}`);
}

async function runMatch(formData: FormData) {
  'use server';
  const industry = String(formData.get('industry') || '');
  const goal = String(formData.get('goal') || '');
  const budget = String(formData.get('budget') || 'free');
  const q = new URLSearchParams({
    industry,
    goal,
    budget,
    matched: '1',
  });
  redirect(`/website/templates?${q.toString()}`);
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const industry = typeof sp.industry === 'string' ? sp.industry : '';
  const goal = typeof sp.goal === 'string' ? sp.goal : '';
  const sort = typeof sp.sort === 'string' ? sp.sort : 'cvr';
  const installed = typeof sp.installed === 'string' ? sp.installed : '';
  const licensed = typeof sp.licensed === 'string' ? sp.licensed : '';
  const invoiceId = typeof sp.invoice === 'string' ? sp.invoice : '';
  const focus = typeof sp.focus === 'string' ? sp.focus : '';
  const budget = typeof sp.budget === 'string' ? sp.budget : 'free';
  const matched = sp.matched === '1';

  let templates: Template[] = [];
  let licenses: License[] = [];
  let invoice: {
    invoice_id: string;
    amount: string;
    qr_image_url: string | null;
    transfer_content: string | null;
    status: string;
    template_code?: string;
  } | null = null;
  let billing: { default_price_vnd?: number } | null = null;
  let matches: {
    matches: Array<{ score: number; reasons: string[]; template: { code: string; name: string } }>;
  } | null = null;
  let error = '';
  try {
    const qs = new URLSearchParams();
    if (industry) qs.set('industry', industry);
    if (goal) qs.set('goal', goal);
    if (sort) qs.set('sort', sort);
    const qstr = qs.toString();
    templates = await apiGet(`/v1/admin/templates${qstr ? `?${qstr}` : ''}`);
    licenses = await apiGet('/v1/admin/theme-licenses');
    billing = await apiGet('/v1/admin/billing/status');
    if (invoiceId) {
      invoice = await apiGet(`/v1/admin/theme-licenses/invoices/${invoiceId}`);
    }
    matches = await apiJson(`/v1/admin/templates/match`, 'POST', {
      industry: industry || 'beauty',
      goal: goal || 'conversion',
      budget,
      catalog_size: 12,
      style: 'sticky-atc',
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const licensedSet = new Set(licenses.filter((l) => l.status === 'active').map((l) => l.template_code));
  const price = billing?.default_price_vnd ?? 1990000;

  return (
    <>
      <PageHeader
        title="Template Marketplace"
        description="P3 — free install · one_time mua theme (VietQR) rồi install"
        actions={<Badge tone="accent">P3 billing</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      {installed ? (
        <Panel title="Installed">
          <p>
            Đã cài <strong>{installed}</strong>
          </p>
        </Panel>
      ) : null}
      {licensed ? (
        <Panel title="Licensed">
          <p>
            Đã cấp license <strong>{licensed}</strong> — có thể Install.
          </p>
        </Panel>
      ) : null}

      {invoice ? (
        <Panel title={`Hóa đơn theme · ${invoice.status}`}>
          <p style={{ fontSize: 14 }}>
            {invoice.template_code} · {invoice.amount} VND
          </p>
          <p style={{ fontSize: 13, opacity: 0.8 }}>Nội dung CK: {invoice.transfer_content}</p>
          {invoice.qr_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invoice.qr_image_url} alt="VietQR" width={220} height={220} />
          ) : null}
          {invoice.status === 'open' ? (
            <form action={simulatePaid.bind(null, invoice.invoice_id)} style={{ marginTop: 12 }}>
              <Button type="submit" variant="primary">
                Simulate paid (stub)
              </Button>
            </form>
          ) : null}
        </Panel>
      ) : null}

      <Panel title="AI Match">
        <form action={runMatch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="industry" defaultValue={industry || 'beauty'} placeholder="industry" />
          <input name="goal" defaultValue={goal || 'conversion'} placeholder="goal" />
          <select name="budget" defaultValue={budget}>
            <option value="free">free</option>
            <option value="one_time">one_time</option>
          </select>
          <Button type="submit" variant="ghost">
            Match
          </Button>
        </form>
        {matched && matches ? (
          <ul style={{ fontSize: 13 }}>
            {matches.matches.slice(0, 5).map((m) => (
              <li key={m.template.code}>
                {m.template.name} ({m.score}) — {m.reasons.join(', ')}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel title={`Catalog (${templates.length}) · one_time ≈ ${price.toLocaleString('vi-VN')}đ`}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
          <a href="/website/templates?sort=cvr">Sort CVR</a>
          <a href="/website/templates">All</a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {templates.map((t) => {
            const hasLic = t.license === 'free' || licensedSet.has(t.code);
            const isFocus = focus === t.code;
            return (
              <div
                key={t.id}
                style={{
                  border: isFocus ? '2px solid var(--ptt-accent, #ff5c1a)' : '1px solid var(--ptt-line, #e5e2dc)',
                  borderRadius: 10,
                  padding: 14,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                  {t.industry} · {t.goal} · {t.license}
                  {hasLic ? ' · licensed' : ''}
                </div>
                <div style={{ fontSize: 12, marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone="accent">CVR {t.scores?.cvr ?? '—'}</Badge>
                  <Badge tone="muted">Mobile {t.scores?.mobile ?? '—'}</Badge>
                  <Badge tone="muted">SEO {t.scores?.seo ?? '—'}</Badge>
                </div>
                {hasLic ? (
                  <InstallWithCompat
                    code={t.code}
                    license={t.license}
                    checkAction={checkCompat}
                    installAction={installTemplate}
                  />
                ) : (
                  <form action={buyTheme.bind(null, t.code)}>
                    <Button type="submit" variant="primary">
                      Mua theme
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
