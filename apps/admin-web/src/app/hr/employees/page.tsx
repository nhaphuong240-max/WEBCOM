import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson, STOREFRONT_ID } from '../../../lib/api';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function createEmployee(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || '').trim();
  const displayName = String(formData.get('display_name') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const department = String(formData.get('department') || '').trim();
  if (!code || !displayName) return;
  await apiJson('/v1/admin/hr/employees', 'POST', {
    code,
    display_name: displayName,
    title: title || undefined,
    department: department || undefined,
    store_ids: [STOREFRONT_ID],
    primary_store_id: STOREFRONT_ID,
  });
  revalidatePath('/hr/employees');
}

export default async function HrEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const sp = await searchParams;
  const qs = sp.department ? `?department=${encodeURIComponent(sp.department)}` : '';
  let rows: Array<{
    id: string;
    code: string;
    display_name: string;
    title: string | null;
    department: string | null;
    status: string;
    user_id: string | null;
    stores: Array<{ store_id: string; is_primary: boolean }>;
  }> = [];
  let error = '';
  try {
    rows = await apiGet(`/v1/admin/hr/employees${qs}`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description="HR-3 · directory + department stub"
        actions={<Badge tone="accent">HR-3</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      <Panel title="Thêm nhân viên">
        <form action={createEmployee} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="code" placeholder="NV-001" required style={{ padding: 8 }} />
          <input name="display_name" placeholder="Họ tên" required style={{ padding: 8 }} />
          <input name="title" placeholder="Chức danh" style={{ padding: 8 }} />
          <input name="department" placeholder="Department" style={{ padding: 8 }} />
          <Button type="submit">Tạo</Button>
        </form>
      </Panel>
      <Panel title={`Directory (${rows.length})`}>
        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            name="department"
            placeholder="filter department"
            defaultValue={sp.department || ''}
            style={{ padding: 8 }}
          />
          <button type="submit" style={{ padding: '8px 12px' }}>
            Filter
          </button>
        </form>
        <ul style={{ fontSize: 13, listStyle: 'none', padding: 0 }}>
          {rows.map((e) => (
            <li key={e.id} style={{ marginBottom: 8 }}>
              <Link href={`/hr/employees/${e.id}`} style={{ fontWeight: 600 }}>
                {e.code}
              </Link>{' '}
              — {e.display_name} · {e.department || '—'} · {e.title || '—'}{' '}
              <Badge tone="muted">{e.status}</Badge>
              {e.user_id ? <span style={{ marginLeft: 8 }}>user linked</span> : null}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
