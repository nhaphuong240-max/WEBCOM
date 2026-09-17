import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

type Domain = {
  id: string;
  hostname: string;
  kind: string;
  dns_status: string;
  tls_status: string;
  verification_token: string;
  is_primary: boolean;
  dns_instructions?: {
    type: string;
    host: string;
    value: string;
    cname?: { host: string; value: string };
    note?: string;
  };
};

async function addSubdomain() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/domains`, 'POST', {
    kind: 'subdomain',
    hostname: 'aura',
  });
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'domain',
    done: true,
  });
  revalidatePath('/website/domains');
  revalidatePath('/website/onboarding');
  revalidatePath('/website/golive');
}

async function addCustom(formData: FormData) {
  'use server';
  const hostname = String(formData.get('hostname') || '').trim();
  if (!hostname) return;
  await apiJson(`/v1/admin/storefronts/${SF}/domains`, 'POST', {
    kind: 'custom',
    hostname,
  });
  revalidatePath('/website/domains');
}

async function verify(domainId: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/domains/${domainId}/verify`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'domain',
    done: true,
  });
  revalidatePath('/website/domains');
  revalidatePath('/website/golive');
}

async function setPrimary(domainId: string) {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/domains/${domainId}/primary`, 'POST', {});
  revalidatePath('/website/domains');
  revalidatePath('/website/golive');
}

export default async function DomainsPage() {
  let domains: Domain[] = [];
  let error = '';
  try {
    const res = await apiGet<{ domains: Domain[] }>(`/v1/admin/storefronts/${SF}/domains`);
    domains = res.domains || [];
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Domain / SSL"
        description="Kết nối subdomain nền tảng hoặc custom domain — TLS staging tự động sau verify"
        actions={<Badge tone="accent">A1 · Domain wizard</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Thêm domain">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <form action={addSubdomain}>
            <Button type="submit" variant="primary">
              Tạo subdomain *.ptt.shop
            </Button>
          </form>
          <form action={addCustom} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label style={{ fontSize: 13 }}>
              Custom hostname
              <input
                name="hostname"
                placeholder="shop.brand.vn"
                style={{
                  display: 'block',
                  marginTop: 4,
                  padding: '8px 10px',
                  border: '1px solid var(--ptt-line, #e5e2dc)',
                  borderRadius: 8,
                  minWidth: 220,
                }}
              />
            </label>
            <Button type="submit">Thêm custom</Button>
          </form>
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12, marginBottom: 0 }}>
          Staging: DNS verify + TLS issue là stub (FEATURE_DOMAIN_TLS). Production gắn Cloudflare /
          cert-manager.
        </p>
      </Panel>

      <Panel title={`Domains (${domains.length})`}>
        {domains.length === 0 ? (
          <p style={{ fontSize: 14, opacity: 0.7 }}>Chưa có domain — tạo subdomain để pass Go-live.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {domains.map((d) => (
              <li
                key={d.id}
                style={{
                  border: '1px solid var(--ptt-line, #e5e2dc)',
                  borderRadius: 10,
                  padding: 14,
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{d.hostname}</strong>{' '}
                    {d.is_primary ? <Badge tone="accent">primary</Badge> : null}{' '}
                    <Badge>{d.kind}</Badge>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      DNS: <Badge tone={d.dns_status === 'verified' ? 'signal' : undefined}>{d.dns_status}</Badge>{' '}
                      TLS: <Badge tone={d.tls_status === 'active' ? 'signal' : undefined}>{d.tls_status}</Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {d.dns_status !== 'verified' ? (
                      <form action={verify.bind(null, d.id)}>
                        <Button type="submit" variant="primary">
                          Verify DNS
                        </Button>
                      </form>
                    ) : null}
                    {!d.is_primary && d.dns_status === 'verified' ? (
                      <form action={setPrimary.bind(null, d.id)}>
                        <Button type="submit">Set primary</Button>
                      </form>
                    ) : null}
                  </div>
                </div>
                {d.dns_instructions ? (
                  <pre
                    style={{
                      fontSize: 11,
                      background: 'var(--ptt-paper-2, #f5f2ec)',
                      padding: 10,
                      borderRadius: 8,
                      overflow: 'auto',
                      marginTop: 10,
                      marginBottom: 0,
                    }}
                  >
                    {JSON.stringify(d.dns_instructions, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
