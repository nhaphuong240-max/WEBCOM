import { Badge, PageHeader, Panel } from '@ptt/ui';
import Link from 'next/link';
import { hrmNav } from '../../lib/nav';

export const dynamic = 'force-dynamic';

export default function HrmHomePage() {
  const links = hrmNav.filter((i) => i.href !== '/hrm');

  return (
    <>
      <PageHeader
        title="HRM-Pro"
        description="HRMP-A/B/C · HĐLĐ · phép · chấm công · bảng lương VN"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      <Panel title="Module routes">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {links.map((item) => (
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
              <Badge tone="muted">{item.mockup}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Feature flag">
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          API và trang này yêu cầu <code>FEATURE_HRM_PRO=true</code> trên admin-api. Khi flag tắt,
          các endpoint <code>/api/v1/admin/hrm/*</code> trả 404/disabled và UI hiển thị lỗi API.
        </p>
        <p style={{ fontSize: 12, color: '#6b5559', marginTop: 10, marginBottom: 0 }}>
          Tách khỏi IAM <Link href="/hr/users">/hr/*</Link> — mọi payroll/leave gắn{' '}
          <code>employee_id</code> từ HR-1.
        </p>
      </Panel>
    </>
  );
}
