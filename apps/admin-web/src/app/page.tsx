import { Badge, Button, Kpi, PageHeader, Panel } from '@ptt/ui';
import Link from 'next/link';
import { websiteNav } from '@/lib/nav';

export default function CommandCenterPage() {
  return (
    <>
      <PageHeader
        title="Command Center"
        description="W0 shell — KPI & exception sẽ nối API ở W1. Website routes đã map theo mockup."
        actions={
          <Button variant="primary" size="sm">
            Tạo đơn
          </Button>
        }
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Kpi label="Contribution margin" value="—" delta="Chờ W4 / RI" emphasis />
        <Kpi label="Net revenue" value="—" />
        <Kpi label="Đơn rủi ro" value="—" />
        <Kpi label="Checkout CVR" value="—" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <Panel title="Website Commerce routes (mockup map)">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {websiteNav.map((item) => (
              <li
                key={item.href}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--ptt-paper-2)',
                  fontSize: 14,
                }}
              >
                <Link href={item.href} style={{ fontWeight: 600, color: 'var(--ptt-accent)' }}>
                  {item.label}
                </Link>
                <Badge tone="muted">mockup {item.mockup}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="API health">
          <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)', marginBottom: 12 }}>
            Dev token: <code>POST /api/v1/auth/dev-token</code>
          </p>
          <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)' }}>
            Tenant context: <code>GET /api/v1/tenancy/context</code>
          </p>
          <div style={{ marginTop: 16 }}>
            <Badge tone="signal">AUTH_DEV_BYPASS</Badge>
          </div>
        </Panel>
      </div>
    </>
  );
}
