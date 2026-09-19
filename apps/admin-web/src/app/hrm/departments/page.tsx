import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function createDepartment(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || '').trim();
  const name = String(formData.get('name') || '').trim();
  if (!code || !name) return;
  await apiJson('/v1/admin/hrm/departments', 'POST', { code, name });
  revalidatePath('/hrm/departments');
}

type Department = {
  id: string;
  code: string;
  name: string;
};

export default async function HrmDepartmentsPage() {
  let rows: Department[] = [];
  let error = '';
  try {
    rows = await apiGet('/v1/admin/hrm/departments');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Departments"
        description="HRMP-A · phòng ban (code + name)"
        actions={<Badge tone="accent">HRM-Pro</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
          <p style={{ fontSize: 12, color: '#6b5559' }}>Cần FEATURE_HRM_PRO=true</p>
        </Panel>
      ) : null}
      <Panel title="Tạo phòng ban">
        <form action={createDepartment} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input name="code" placeholder="PB-OPS" required style={{ padding: 8 }} />
          <input name="name" placeholder="Tên phòng ban" required style={{ padding: 8 }} />
          <Button type="submit">Tạo</Button>
        </form>
      </Panel>
      <Panel title={`Danh sách (${rows.length})`}>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b5559' }}>Chưa có phòng ban</p>
        ) : (
          <ul style={{ fontSize: 13, listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((d) => (
              <li key={d.id} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{d.code}</span> — {d.name}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
