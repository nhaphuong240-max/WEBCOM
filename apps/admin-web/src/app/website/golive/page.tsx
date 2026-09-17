import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';

async function evaluate() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/golive/evaluate`, 'POST', {});
  revalidatePath('/website/golive');
}

async function waive(code: string, formData: FormData) {
  'use server';
  const reason = String(formData.get('reason') || '');
  await apiJson(`/v1/admin/storefronts/${SF}/golive/waive`, 'POST', { code, reason });
  revalidatePath('/website/golive');
}

async function publish() {
  'use server';
  await apiJson(`/v1/admin/storefronts/${SF}/publish`, 'POST', {});
  await apiJson(`/v1/admin/storefronts/${SF}/onboarding/advance`, 'POST', {
    step: 'golive',
    done: true,
  });
  revalidatePath('/website/golive');
  revalidatePath('/website/themes');
}

export default async function GolivePage() {
  let checklist: {
    can_publish: boolean;
    blocking_fails: string[];
    items: Array<{
      code: string;
      title: string;
      group_key: string;
      severity: string;
      status: string;
      waived_reason?: string | null;
    }>;
  } | null = null;
  let publishError = '';
  let error = '';
  try {
    checklist = await apiGet(`/v1/admin/storefronts/${SF}/golive`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Go-live Checklist"
        description="BR-025 — blocking fail chặn publish (trừ waiver + audit)"
        actions={<Badge tone="accent">W3 · mockup 07</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Gate">
        <p style={{ fontSize: 14 }}>
          {checklist?.can_publish ? (
            <Badge tone="accent">Có thể Publish</Badge>
          ) : (
            <>
              <Badge>Blocked</Badge> {checklist?.blocking_fails?.join(', ')}
            </>
          )}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <form action={evaluate}>
            <Button type="submit" variant="ghost">
              Re-evaluate
            </Button>
          </form>
          <form
            action={async () => {
              'use server';
              try {
                await publish();
              } catch (e) {
                // surface via revalidate; admin sees next load
                console.error(e);
              }
            }}
          >
            <Button type="submit" variant="primary" disabled={!checklist?.can_publish}>
              Publish (gated)
            </Button>
          </form>
        </div>
        {publishError ? <p style={{ color: 'crimson' }}>{publishError}</p> : null}
      </Panel>

      <Panel title="Checklist items">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(checklist?.items || []).map((item) => (
            <div
              key={item.code}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr auto',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #eee',
                fontSize: 13,
                alignItems: 'start',
              }}
            >
              <span>{item.status === 'pass' ? '✓' : item.status === 'waived' ? '⚠' : '○'}</span>
              <div>
                <strong>{item.title}</strong>
                <div style={{ opacity: 0.65 }}>
                  {item.group_key} · {item.severity} · {item.status}
                  {item.waived_reason ? ` · waiver: ${item.waived_reason}` : ''}
                </div>
                {item.status === 'fail' ? (
                  <form action={waive.bind(null, item.code)} style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <input
                      name="reason"
                      placeholder="Lý do waiver…"
                      required
                      minLength={5}
                      style={{ flex: 1, padding: 6 }}
                    />
                    <Button type="submit" variant="ghost">
                      Waiver
                    </Button>
                  </form>
                ) : null}
              </div>
              <Badge tone={item.status === 'pass' ? 'accent' : undefined}>{item.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
